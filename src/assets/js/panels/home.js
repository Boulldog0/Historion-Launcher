/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

'use strict';

import { logger, database, changePanel} from '../utils.js';

const { Launch, Status } = require('minecraft-java-core-azbetter');
const { ipcRenderer, shell } = require('electron');
const launch = new Launch();
const pkg = require('../package.json');
const axios = require('axios');
const crypto = require('crypto');
const websiteUrl = 'https://historion.wstr.fr';
const dataDirectory = process.env.APPDATA || (process.platform == 'darwin' ? `${process.env.HOME}/Library/Application Support` : process.env.HOME)

class Home {
    static id = "home";
    async init(config, news) {
        this.database = await new database().init();
        this.config = config
        this.news = await news
        this.initNews();
        this.initPlayBtns();
        this.initLaunch();
        this.initStatusServer();
        this.initBtn();
        this.initInfos();
        this.initAdvert();
        this.initVideo();
    }

    async initNews() {
        let news = document.querySelector('.news-list');
        if (this.news) {
            if (!this.news.length) {
                let blockNews = document.createElement('div');
                blockNews.classList.add('news-block', 'opacity-1');
                blockNews.innerHTML = `
                    <div class="news-header">
                        <div class="header-text">
                            <div class="title">Aucun news n'ai actuellement disponible.</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Vous pourrez suivre ici toutes les news relative au serveur.</p>
                        </div>
                    </div>`
                news.appendChild(blockNews);
            } else {
                for (let News of this.news) {
                    let date = await this.getdate(News.publish_date)
                    let blockNews = document.createElement('div');
                    blockNews.classList.add('news-block');
                    blockNews.innerHTML = `
                        <div class="news-header">
                            <div class="header-text">
                                <div class="title">${News.title}</div>
                            </div>
                            <div class="date">
                                <div class="day">${date.day}</div>
                                <div class="month">${date.month}</div>
                            </div>
                        </div>
                        <div class="news-content">
                            <div class="bbWrapper">
                                <p>${News.content}</p>
                                <p class="news-author"><span> ${News.author}</span></p>
                            </div>
                        </div>`
                    news.appendChild(blockNews);
                }
            }
        } else {
            let blockNews = document.createElement('div');
            blockNews.classList.add('news-block', 'opacity-1');
            blockNews.innerHTML = `
                <div class="news-header">
                    <div class="header-text">
                        <div class="title">Error.</div>
                    </div>
                </div>
                <div class="news-content">
                    <div class="bbWrapper">
                        <p>Impossible de contacter le serveur des news.</br>Merci de vérifier votre configuration.</p>
                    </div>
                </div>`
        }
        let serverimg = document.querySelector('.server-img')
        serverimg.setAttribute("src", `${this.config.server_img}`)
        if(!this.config.server_img) {
            serverimg.style.display = "none";
        }
    }

    
    async initInfos() {
        let uuid = (await this.database.get('1234', 'accounts-selected')).value;
        let account = (await this.database.get(uuid.selected, 'accounts')).value;
    
        const blockName = document.querySelector('.player-name');
        blockName.innerHTML = `${account.name}`;
    }

    async initAdvert() {
        const response = await fetch('https://launcher.historion.wstr.fr/api/advert.json');
        const data = await response.json();
        const advertBanner = document.querySelector('.advert-banner');

        if(data.enabled) {
            const message = data.message;

            advertBanner.innerHTML = message;
            advertBanner.style.display = 'block';
        } else {
            advertBanner.style.display = 'none'; 
        }
    } 
    
    async initPlayBtns() {
        let ram = (await this.database.get('1234', 'ram')).value;

        if(ram.ramMax < 3) {
            const launchBtn = document.querySelectorAll(".icon-play");
            document.querySelector('.avert-home').style.display = 'block';
            launchBtn.forEach(launchBtn => {
                launchBtn.style.pointerEvents = "none";
                launchBtn.style.backgroundColor = "#696969";
                launchBtn.style.boxShadow = "none";
                document.querySelector('.play-btn').style.fontSize = "15px";
                document.querySelector('.play-btn').innerHTML = "Ram insuffisante."
            })
        } else {
            document.querySelector('.avert-home').style.display = 'none';
        }
    }

    async initLaunch() {
        const playBtns = document.querySelectorAll('.icon-play');

        playBtns.forEach(playBtns => {
            playBtns.addEventListener('click', async () => {
                let urlpkg = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;
                let uuid = (await this.database.get('1234', 'accounts-selected')).value;
                let account = (await this.database.get(uuid.selected, 'accounts')).value;
                let ram = (await this.database.get('1234', 'ram')).value;
                let javaPath = (await this.database.get('1234', 'java-path')).value;
                let javaArgs = (await this.database.get('1234', 'java-args')).value;
                let Resolution = (await this.database.get('1234', 'screen')).value;
                let launcherSettings = (await this.database.get('1234', 'launcher')).value;
                let screen;
    
                document.querySelector(".icon-play").style.backgroundColor = "#696969";
                document.querySelector(".icon-play").style.pointerEvents = "none";
                document.querySelector(".icon-play").style.boxShadow = "none";
    
                let playBtn = document.querySelector('.play-btn');
                let info = document.querySelector(".text-download")
                let progressBar = document.querySelector(".progress-bar")
                let speedDownload = document.querySelector(".speed-download-text")
                let timeRemaining = document.querySelector('.time-remaining-dl')
    
                if (Resolution.screen.width == '<auto>') {
                    screen = false
                } else {
                    screen = {
                        width: Resolution.screen.width,
                        height: Resolution.screen.height
                    }
                }
    
                let opts = {
                    url: `https://launcher.historion.wstr.fr/panel/data`,
                    authenticator: account,
                    timeout: 15000,
                    path: `${dataDirectory}/${process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`,
                    version: this.config.game_version,
                    detached: launcherSettings.launcher.close === 'close-all' ? false : true,
                    downloadFileMultiple: 20,
                    loader: {
                        type: this.config.loader.type,
                        build: this.config.loader.build,
                        enable: this.config.loader.enable,
                    },
                    verify: this.config.verify,
                    ignored: this.config.ignored,
    
                    java: this.config.java,
                    memory: {
                        min: `${ram.ramMin * 1024}M`,
                        max: `${ram.ramMax * 1024}M`
                    },
                }
    
                playBtn.style.display = "none"
                info.style.display = "block"
                launch.Launch(opts);
    
                launch.on('extract', extract => {
                    console.log(extract);
                });
    
                launch.on('progress', (progress, size) => {
                    progressBar.style.display = "block"
                    document.querySelector(".text-download").innerHTML = `Téléchargement (${((progress / size) * 100).toFixed(0)}%)`
                    ipcRenderer.send('main-window-progress', { progress, size })
                    progressBar.value = progress;
                    progressBar.max = size;
                });
    
                launch.on('check', (progress, size) => {
                    progressBar.style.display = "block"
                    document.querySelector(".text-download").innerHTML = `Vérification (${((progress / size) * 100).toFixed(0)}%)`
                    progressBar.value = progress;
                    progressBar.max = size;
                });
    
                launch.on('estimated', (time) => {
                    let hours = Math.floor(time / 3600);
                    let minutes = Math.floor((time - hours * 3600) / 60);
                    let seconds = Math.floor(time - hours * 3600 - minutes * 60);
                    timeRemaining.style.display = "block"
                    timeRemaining.innerHTML = `Temps restant : ${hours}h ${minutes}m ${seconds}s`
                })
    
                launch.on('speed', (speed) => {
                    speedDownload.style.display = "block"
                    speedDownload.innerHTML = `Vitesse de téléchargement ${(speed / 1067008).toFixed(2)} Mb/s`
                })
    
                launch.on('patch', patch => {
                    console.log(patch);
                    info.innerHTML = `Patch en cours...`
                });
    
                launch.on('data', (e) => {
                    new logger('Minecraft', '#36b030');
                    if (launcherSettings.launcher.close === 'close-launcher') ipcRenderer.send("main-window-hide");
                    ipcRenderer.send('main-window-progress-reset')
                    progressBar.style.display = "none"
                    timeRemaining.style.display = "none"
                    speedDownload.style.display = "none"
                    info.innerHTML = `Demarrage en cours...`
                    console.log(e);
                })
    
                launch.on('close', code => {
                    if (launcherSettings.launcher.close === 'close-launcher') ipcRenderer.send("main-window-show");
                    progressBar.style.display = "none"
                    info.style.display = "none"
                    playBtn.style.display = "block"
                    info.innerHTML = `Vérification`
                    new logger('Launcher', '#7289da');
                    console.log('Close');
                });
    
                launch.on('error', err => {
                    console.log(err);
                });
            })
        })
    }  

    async initVideo() {
        const response = await fetch('https://launcher.historion.wstr.fr/api/video.json');
        const data = await response.json();

        const youtubeVideoId = data.video_id;
        const youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
        const videoContainer = document.querySelector('.youtube-thumbnail');
        const thumbnailImg = videoContainer.querySelector('.thumbnail-img');
        const playButton = videoContainer.querySelector('.ytb-play-btn');

        const videoCredits = document.querySelector('.video-credits');

        const videoAuthor = data.author;

        videoCredits.innerHTML = `Vidéo créée par ${videoAuthor}`

        const btn = document.querySelector('.ytb-btn');

        btn.addEventListener('click', () => {
            shell.openExternal(`https:/youtube.com/watch?v=${youtubeVideoId}`);
        });
    
        if (thumbnailImg && playButton) {
            thumbnailImg.src = youtubeThumbnailUrl;
    
            videoContainer.addEventListener('click', () => {
                videoContainer.innerHTML = `<iframe width="500" height="290" src="https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
            });
        }
    }    

    async initStatusServer() {
        let nameServer = document.querySelector('.server-text .name');
        let serverMs = document.querySelector('.server-text .desc');
        let playersConnected = document.querySelector('.etat-text .text');
        let online = document.querySelector(".etat-text .online");
        let serverPing = await new Status(this.config.status.ip, this.config.status.port).getStatus();

        if (!serverPing.error) {
            nameServer.textContent = this.config.status.nameServer;
            serverMs.innerHTML = `<span class="green">En ligne</span> - ${serverPing.ms}ms`;
            online.classList.toggle("off");
            playersConnected.textContent = serverPing.playersConnect;
        } else if (serverPing.error) {
            nameServer.textContent = 'Serveur indisponible';
            serverMs.innerHTML = `<span class="red">Hors ligne</span>`;
        }
    }

    initBtn() {
        document.querySelector('.set-btn').addEventListener('click', () => {
            changePanel("settings");
        });

        document.querySelector('.home-btn').addEventListener('click', () => {
            changePanel("home");
        });

        document.querySelector('.discord').addEventListener('click', () => {
            shell.openExternal("https://discord.gg/SNJA52uEYH");
        });

        document.querySelector('.site').addEventListener('click', () => {
            shell.openExternal("https://luminaria-mc.fr");
        });

        document.querySelector('.wiki').addEventListener('click', () => {
            shell.openExternal("https://luminaria-mc.fr/wiki");
        });
    }

    async getdate(e) {
        let date = new Date(e)
        let year = date.getFullYear()
        let month = date.getMonth() + 1
        let day = date.getDate()
        let allMonth = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
        return { year: year, month: allMonth[month - 1], day: day }
    }
}

export default Home;