import {Router} from "../WebServer";
import AuthLogin from "./auth/AuthLogin";
import IndexRouter from "./IndexRouter";
import Login from "../../web/components/Login";
import * as React from "react";
import AuthMiddleware from "../middleware/AuthMiddleware";
import {mongo} from "../../start";

export default class AuthRouter extends Router {

    constructor() {
        super("/auth");

        this.post("/login", (req, res) => {
            AuthLogin.executeLogin(req, res, (errMessage, errCode) => {
                if (req['_icetea'].isAuthenticated()) {
                    // already logged-in, redirect to home
                    res.redirect(req.url);
                    return;
                }
                if (req.header("content-type") === "application/json") {
                    if (!errMessage) {
                        res.status(200).json({success: true});
                        return;
                    }
                    res.status(errCode ? errCode : 403).json({
                        success: false,
                        message: errMessage ? errMessage : "Login failed."
                    });
                    return;
                }
                // login using form
                if (errMessage) {
                    // login failed
                    let render = IndexRouter.renderWithContainer(req, "Login", undefined,
                        React.createElement(Login, {
                            gate_message: {
                                type: "error",
                                content: errMessage,
                                title: "Login Failed"
                            }
                        }));
                    res.send(render);
                    return;
                }
                // all good, go back home
                res.redirect('/');
            });
        });
        this.get("/login", (req, res) => {
            if (req['_icetea'].isAuthenticated()) {
                // already logged-in, redirect to home
                res.redirect('/');
            } else {
                let render = IndexRouter.renderWithContainer(req, "Login",
                    undefined, React.createElement(Login));
                res.send(render);
            }
        });
        this.all("/logout", (req, res) => {
            let redirectUri = req.query['redirect'];
            if (!redirectUri) {
                redirectUri = "/"; // default
            }
            if (!req['_icetea'].isAuthenticated()) {
                // not authenticated, go back home
                res.redirect('/');
                return;
            }
            // delete session from cookie
            res.clearCookie(AuthMiddleware.COOKIE_SESSION_ID);
            res.redirect(redirectUri);
            // delete the session from the database
            mongo.deleteOne(req['_icetea'].session, (err, result) => {
                if (err) {
                    throw err;
                }
            });
        });

        /* API base route */
        this.get('/', (req, res) => {
            res.end("Auth: root");
        });
        this.get('*', (req, res) => {
            res.status(404).end("Auth: Not Found");
        });
    }
}
