/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

'use strict';

import { database, changePanel, addAccount, accountSelect } from '../utils.js';
const fetch = require('node-fetch');
const { AZauth } = require('minecraft-java-core-azbetter');
const { ipcRenderer } = require('electron');
const pkg = require('../package.json');
const url = "https://historion.wstr.fr";

class Login {
    
    static id = "login";
    async init(config) {
        this.config = config
        this.database = await new database().init();
        if (this.config.online) this.getOnline()
        else this.getOffline()
    }

    getOnline() {
        console.log(`Initializing Az Panel...`)
        this.loginMicrosoft();
        this.loginMojang();
        document.querySelector('.cancel-login').addEventListener("click", () => {
            document.querySelector(".cancel-login").style.display = "none";
            changePanel("settings");
        })
    }

    getOffline() {
        console.log(`Initializing microsoft Panel...`)
        console.log(`Initializing mojang Panel...`)
        console.log(`Initializing offline Panel...`)
        this.loginMicrosoft();
        this.loginOffline();
        document.querySelector('.cancel-login').addEventListener("click", () => {
            document.querySelector(".cancel-login").style.display = "none";
            changePanel("settings");
        })
    }

    loginMicrosoft() {
        let microsoftBtn = document.querySelector('.microsoft')
        let mojangBtn = document.querySelector('.mojang')
        let cancelBtn = document.querySelector('.cancel-login')
       
        microsoftBtn.addEventListener("click", () => {
            microsoftBtn.disabled = true;
            mojangBtn.disabled = true;
            cancelBtn.disabled = true;
            ipcRenderer.invoke('Microsoft-window', this.config.client_id).then(account_connect => {
                if (!account_connect) {
                    microsoftBtn.disabled = false;
                    mojangBtn.disabled = false;
                    cancelBtn.disabled = false;
                    return;
                }

                let account = {
                    access_token: account_connect.access_token,
                    client_token: account_connect.uuid,
                    uuid: account_connect.uuid,
                    name: account_connect.name,
                    refresh_token: account_connect.refresh_token,
                    user_properties: account_connect.user_properties,
                    meta: {
                        type: account_connect.meta.type,
                        demo: account_connect.meta.demo
                    },
                    user_info: {
                        role: account_connect.user_info.role,
                        monnaie: account_connect.user_info.money,
                    },
                }

                let profile = {
                    uuid: account_connect.uuid,
                    skins: account_connect.profile.skins || [],
                    capes: account_connect.profile.capes || []
                }

                this.database.add(account, 'accounts')
                this.database.add(profile, 'profile')
                this.database.update({ uuid: "1234", selected: account.uuid }, 'accounts-selected');

                addAccount(account)
                accountSelect(account.uuid)
                changePanel("settings");

                microsoftBtn.disabled = false;
                mojangBtn.disabled = false;
                cancelBtn.disabled = false;
                cancelBtn.style.display = "none";
            }).catch(err => {
                console.log(err)
                microsoftBtn.disabled = false;
                mojangBtn.disabled = false;
                cancelBtn.disabled = false;

            });
        })
    }

    async loginMojang() {
        let mailInput = document.querySelector('.Mail')
        let passwordInput = document.querySelector('.Password')
        let cancelMojangBtn = document.querySelector('.cancel-mojang')
        let infoLogin = document.querySelector('.info-login')
        let infoConnect = document.querySelector('.info-connect')
        let loginBtn = document.querySelector(".login-btn")
        let mojangBtn = document.querySelector('.mojang')
        let loginBtn2f = document.querySelector('.login-btn-2f')
        let a2finput = document.querySelector('.a2f')
        let infoLogin2f = document.querySelector('.info-login-2f')
        let cancel2f = document.querySelector('.cancel-2f')
        
        let azauth = this.config.azauth
        let newuserurl = `${azauth}/user/register`
        this.newuser = document.querySelector(".new-user");
        this.newuser.innerHTML="Pas de compte ?"
        this.newuser.setAttribute ("href", newuserurl)

        let passwordreseturl = `${azauth}/user/password/reset`
        this.passwordreset = document.querySelector(".password-reset");
        this.passwordreset.innerHTML="Mot de passe oublié ?"
        this.passwordreset.setAttribute ("href", passwordreseturl)

        let emailverifyurl = `${azauth}/profile`
        this.emailverifyurl = document.querySelector(".email_invalid");
        this.emailverifyurl.innerHTML="Email non vérifiée ?"
        this.emailverifyurl.setAttribute ("href", emailverifyurl)

        mojangBtn.addEventListener("click", () => {
            document.querySelector(".login-card").style.display = "none";
            document.querySelector(".login-card-mojang").style.display = "block";
            document.querySelector('.a2f-card').style.display = "none";
        })

        cancelMojangBtn.addEventListener("click", () => {
            document.querySelector(".login-card").style.display = "block";
            document.querySelector(".login-card-mojang").style.display = "none";
            document.querySelector('.a2f-card').style.display = "none";
        })
        cancel2f.addEventListener("click", () => {
            document.querySelector(".login-card").style.display = "block";
            document.querySelector(".login-card-mojang").style.display = "none";
            document.querySelector('.a2f-card').style.display = "none";
            infoLogin.style.display = "none";
            cancelMojangBtn.disabled = false;
            mailInput.value = "";
            loginBtn.disabled = false;
            mailInput.disabled = false;
            passwordInput.disabled = false;
            passwordInput.value = "";
        })

        loginBtn2f.addEventListener("click", async() => {
         if (a2finput.value == "") {
                infoLogin.style.display = "block";
                infoLogin2f.innerHTML = "⚠️ Erreur ⚠️ :<br>Veuillez entrer votre code A2F"
                return
            }
            let azAuth = new AZauth(azauth);

            await azAuth.login(mailInput.value, passwordInput.value, a2finput.value).then(async account_connect => {
                console.log(account_connect);
                if (account_connect.error) {
                    infoLogin.style.display = "block";
                    infoLogin2f.innerHTML = '⚠️ Erreur ⚠️ :<br>Votre code A2F est invalide'
                    return
                }
                let account = {
                    access_token: account_connect.access_token,
                    client_token: account_connect.uuid,
                    uuid: account_connect.uuid,
                    name: account_connect.name,
                    user_properties: account_connect.user_properties,
                    meta: {
                        type: account_connect.meta.type,
                        offline: true
                    },
                    user_info: {
                        role: account_connect.user_info.role,
                        monnaie: account_connect.user_info.money,
                    },
                    
                    
                }

                this.database.add(account, 'accounts')
                this.database.update({ uuid: "1234", selected: account.uuid }, 'accounts-selected');

                addAccount(account)
                accountSelect(account.uuid)
                changePanel("settings");

                cancelMojangBtn.disabled = false;
                cancelMojangBtn.click();
                mailInput.value = "";
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                loginBtn.style.display = "block";
                infoLogin.innerHTML = "&nbsp;";
            })

        })

        loginBtn.addEventListener("click", async() => {
            cancelMojangBtn.disabled = true;
            loginBtn.disabled = true;
            mailInput.disabled = true;
            passwordInput.disabled = true;
            infoLogin.innerHTML = "Connexion en cours...";


            if (mailInput.value == "") {
                console.log(mailInput.value);
                infoLogin.style.display = "block";
                infoLogin.innerHTML = "⚠️ Erreur ⚠️ :<br>Veuillez entrer votre pseudo"
                cancelMojangBtn.disabled = false;
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                return
            }

            if (passwordInput.value == "") {
                infoLogin.style.display = "block";
                infoLogin.innerHTML = "⚠️ Erreur ⚠️ :<br>Veuillez entrer votre mot de passe"
                cancelMojangBtn.disabled = false;
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                return
            }
            let azAuth = new AZauth(azauth);

            await azAuth.login(mailInput.value, passwordInput.value).then(async account_connect => {
                console.log(account_connect);

                if (account_connect.A2F === true) {
                    document.querySelector('.a2f-card').style.display = "block";
                    document.querySelector(".login-card-mojang").style.display = "none";
                    cancelMojangBtn.disabled = false;
                    return

                }

                if (mailInput.value == "") {
                    infoLogin.style.display = "block";
                    infoLogin.innerHTML = "⚠️ Erreur ⚠️ :<br>Veuillez entrer votre adresse email / Nom d'utilisateur"
                    cancelMojangBtn.disabled = false;
                    loginBtn.disabled = false;
                    mailInput.disabled = false;
                    passwordInput.disabled = false;
                    return
                }
    
                if (mailInput.value.length < 3) {
                    infoLogin.style.display = "block";
                    infoLogin.innerHTML = "⚠️ Erreur ⚠️ :<br>Votre nom d'utilisateur doit avoir au moins 3 caractères"
                    cancelMojangBtn.disabled = false;
                    loginBtn.disabled = false;
                    mailInput.disabled = false;
                    passwordInput.disabled = false;
                    return
                }
                
                if (account_connect.reason == 'invalid_credentials') {
                    cancelMojangBtn.disabled = false;
                    loginBtn.disabled = false;
                    mailInput.disabled = false;
                    passwordInput.disabled = false;
                    infoLogin.style.display = "block";
                    infoLogin.innerHTML = '⚠️ Erreur ⚠️ :<br>Les identifiants fournis sont invalides !'
                    return
                }
                
                if (!account_connect.user_info.verified) {
                    cancelMojangBtn.disabled = false;
                    loginBtn.disabled = false;
                    mailInput.disabled = false;
                    passwordInput.disabled = false;
                    infoLogin.style.display = "block";
                    infoLogin.innerHTML = '⚠️ Erreur ⚠️ :<br>Votre adresse email n\'est pas vérifiée. <br>Merci de la vérifier avant de pouvoir vous connecter.'
                    return
                }
               
                if (account_connect.reason === 'user_banned') {
                    cancelMojangBtn.disabled = false;
                    loginBtn.disabled = false;
                    mailInput.disabled = false;
                    passwordInput.disabled = false;
                    infoLogin.style.display = "block";
                    infoLogin.innerHTML = `⚠️ Erreur ⚠️ :<br>Votre compte est banni. <br>Merci de vous rendre sur notre discord pour toute contestation.`
                    return
                }
                
                cancelMojangBtn.addEventListener("click", () => {
                    document.querySelector(".login-card").style.display = "block";
                    document.querySelector(".login-card-mojang").style.display = "none";
                    document.querySelector('.a2f-card').style.display = "none";
                })    

                let account = {
                    access_token: account_connect.access_token,
                    client_token: account_connect.uuid,
                    uuid: account_connect.uuid,
                    name: account_connect.name,
                    user_properties: account_connect.user_properties,
                    meta: {
                        type: account_connect.meta.type,
                        offline: true
                    },
                    user_info: {
                        role: account_connect.user_info.role,
                        monnaie: account_connect.user_info.money,
                    },
                    
                    
                }

                this.database.add(account, 'accounts')
                this.database.update({ uuid: "1234", selected: account.uuid }, 'accounts-selected');

                addAccount(account)
                accountSelect(account.uuid)
                changePanel("settings");
                changePanel("settings");

                cancelMojangBtn.disabled = false;
                cancelMojangBtn.click();
                mailInput.value = "";
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                loginBtn.style.display = "block";
                infoLogin.innerHTML = "&nbsp;";
            }).catch(err => {
                console.log(err);
                cancelMojangBtn.disabled = false;
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                infoLogin.style.display = "block";
                infoLogin.innerHTML = '⚠️ Erreur ⚠️ :<br>Adresse E-mail/Pseudo ou mot de passe invalide'
            })
        })
    }

    loginOffline() {
        let mailInput = document.querySelector('.Mail')
        let passwordInput = document.querySelector('.Password')
        let cancelMojangBtn = document.querySelector('.cancel-mojang')
        let infoLogin = document.querySelector('.info-login')
        let loginBtn = document.querySelector(".login-btn")
        let mojangBtn = document.querySelector('.mojang')

        mojangBtn.innerHTML = "Offline"

        mojangBtn.addEventListener("click", () => {
            document.querySelector(".login-card").style.display = "none";
            document.querySelector(".login-card-mojang").style.display = "block";
        })

        cancelMojangBtn.addEventListener("click", () => {
            document.querySelector(".login-card").style.display = "block";
            document.querySelector(".login-card-mojang").style.display = "none";
        })

        loginBtn.addEventListener("click", () => {
            cancelMojangBtn.disabled = true;
            loginBtn.disabled = true;
            mailInput.disabled = true;
            passwordInput.disabled = true;
            loginBtn.innerHTML = "Connexion en cours...";

            if (mailInput.value == "") {
                infoLogin.style.display = "block";
                infoLogin.innerHTML = "⚠️ Erreur ⚠️ :<br>Entrez votre adresse email / Nom d'utilisateur"
                cancelMojangBtn.disabled = false;
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                return
            }

            if (mailInput.value.length < 3) {
                infoLogin.style.display = "block";
                infoLogin.innerHTML = "⚠️ Erreur ⚠️ :<br>Votre nom d'utilisateur doit avoir au moins 3 caractères"
                cancelMojangBtn.disabled = false;
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                return
            }

            Mojang.getAuth(mailInput.value, passwordInput.value).then(async account_connect => {
                let account = {
                    access_token: account_connect.access_token,
                    client_token: account_connect.uuid,
                    uuid: account_connect.uuid,
                    name: account_connect.name,
                    user_properties: account_connect.user_properties,
                    meta: {
                        type: account_connect.meta.type,
                        offline: true
                    },
                    user_info: {
                        role: account_connect.user_info.role,
                        monnaie: account_connect.user_info.money,
                    },
                    
                    
                }

                this.database.add(account, 'accounts')
                this.database.update({ uuid: "1234", selected: account.uuid }, 'accounts-selected');

                addAccount(account)
                accountSelect(account.uuid)
                changePanel("settings");
                changePanel("settings");

                cancelMojangBtn.disabled = false;
                cancelMojangBtn.click();
                mailInput.value = "";
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                loginBtn.style.display = "block";
                infoLogin.innerHTML = "&nbsp;";
            }).catch(err => {
                console.log(err)
                cancelMojangBtn.disabled = false;
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                infoLogin.style.display = "block";
                infoLogin.innerHTML = '⚠️ Erreur ⚠️ :<br>Une erreur est survenue lors de la tentative de connexion.<br>Merci de reesayer ulterieurement, et contactez le staff si l\'erreur periste.'
            })
        })
    }
}

export default Login;
