const express = require("express");

const { query, validationResult, body } = require("express-validator");

const session = require("express-session");

const pgSession = require("connect-pg-simple")(session);

const path = require("path");

const passport = require("passport");
const pool = require("./db/pool");

const bcrypt = require("bcryptjs");

const LocalStrategy = require("passport-local").Strategy;

require("dotenv").config();

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM users WHERE username =$1`,
        [username]
      );

      const user = rows[0];

      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return done(null, false, {
          message: "Incorrect password",
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    const user = rows[0];

    done(null, user);
  } catch (err) {
    done(err);
  }
});

const app = express();

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(
  session({
    secret: "cats",
    resave: false,
    saveUninitialized: true,
    store: new pgSession({
      pool: pool,
    }),
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
  })
);

app.use(passport.session());

app.use(express.urlencoded({ extended: false }));

app.use(express.static("public"));

app.get("/sign-up", (req, res) => {
  res.render("sign-up", { errors: null });
});

app.get("/", (req, res) => {
  res.render("index", { user: req.user });
});

app.get("/board", async (req, res, next) => {
  console.log("user is", req.user);
  //return joined table
  try {
    const { rows } = await pool.query(
      `SELECT messages.id, messages.content, messages.created_at, users.username AS user_name, users.status, users.isadmin  FROM messages JOIN users ON messages.user_id = users.id WHERE users.status= 'active';`
    );

    console.log(rows);

    res.render("board", { messages: rows, user: req.user });
  } catch (err) {
    return next(err);
  }
});

app.get("/enter-code", (req, res) => {
  res.render("enter-code");
});

//post route with custom validator for password

app.post(
  "/sign-up",
  body("password")
    .isLength({ min: 4 })
    .withMessage("Password needs to be at least 3 characters"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error(
        "Password does not match. Please enter matching password"
      );
    }
    return value === req.body.password;
  }),
  async (req, res, next) => {
    const errors = validationResult(req);

    console.log(errors);

    if (!errors.isEmpty()) {
      return res.status(400).render("sign-up", {
        errors: errors.array(),
        user: req.body,
      });
    }

    //the issue is that the errors was set at the point when errors is already run
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const result = await pool.query(
        `INSERT INTO users(username, password, first_name, last_name,status) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          req.body.username,
          hashedPassword,
          req.body.first_name,
          req.body.last_name,
          "inactive",
        ]
      );

      //here i will login after registration
      req.login(
        {
          id: result.rows[0].id,
          username: req.body.username,
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          status: "inactive",
        },
        (err) => {
          if (err) return next(err);
          res.redirect("/enter-code");
        }
      );
    } catch (err) {
      return next(err);
    }
  }
);

app.post("/message", async (req, res, next) => {
  console.log("posting message, user is", req.user);

  try {
    await pool.query(`INSERT INTO messages(content, user_id) VALUES ($1, $2)`, [
      req.body.message,
      req.user.id,
    ]);

    res.redirect("/board");
  } catch (err) {
    return next(err);
  }
});

app.post("/update-membership", async (req, res, next) => {
  console.log("user to patch is", req.user);
  if (req.body.code === "doggy") {
    try {
      await pool.query(`UPDATE users SET status=$1 WHERE id=$2`, [
        "active",
        req.user.id,
      ]);
      res.redirect("/");
    } catch (err) {
      return next(err);
    }
  } else {
    res.render("enter-code", {
      error: "Incorrect code, please try again",
    });
  }
});

app.post("/delete-message", async (req, res, next) => {
  const { id } = req.query;

  try {
    await pool.query(`DELETE FROM messages WHERE id=$1`, [id]);
  } catch (err) {
    return next(err);
  }

  res.redirect("/board");
});

app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  })
);

app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.listen("3000", () => {
  console.log("app listening at http://localhost:3000");
});
