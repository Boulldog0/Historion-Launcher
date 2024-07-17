/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

'use strict';

import { database, changePanel, accountSelect, Slider } from '../utils.js';
const dataDirectory = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME)

const os = require('os')
const websiteUrl = 'https://luminaria-mc.fr';
const fetch = require('node-fetch');
const path = require('path')
const fs = require('fs')
const { ipcRenderer, shell } = require('electron');

class Settings {
    static id = "settings";
    async init(config) {
        this.config = config;
        this.database = await new database().init();
        this.initSettingsDefault();
        this.initTab();
        this.initAccount();
        this.initRam();
        this.initLauncherSettings();
        this.initSkin();
        this.updateModsConfig();
        this.initOptionalMods();
    }

    async initAccount() {
        document.querySelector('.accounts').addEventListener('click', async(e) => {
            let uuid = e.target.id;
            let selectedaccount = await this.database.get('1234', 'accounts-selected');

            if (e.path[0].classList.contains('account')) {
                accountSelect(uuid);
                this.database.update({ uuid: "1234", selected: uuid }, 'accounts-selected');
            }

            if (e.target.classList.contains("account-delete")) {
                this.database.delete(e.path[1].id, 'accounts');

                document.querySelector('.accounts').removeChild(e.path[1])
                if (!document.querySelector('.accounts').children.length) {
                    changePanel("login");
                    return
                }

                if (e.path[1].id === selectedaccount.value.selected) {
                    let uuid = (await this.database.getAll('accounts'))[0].value.uuid
                    this.database.update({
                        uuid: "1234",
                        selected: uuid
                    }, 'accounts-selected')
                    accountSelect(uuid)
                }
            }
        })

        document.querySelector('.add-account').addEventListener('click', () => {
            document.querySelector(".cancel-login").style.display = "contents";
            changePanel("login");
        })
    }

    async updateModsConfig() {
        const modsDir = path.join(dataDirectory, '.historion', 'mods');
        const launcherConfigDir = path.join(dataDirectory, '.historion', 'launcher_config');
        const modsConfigFile = path.join(launcherConfigDir, 'mods_config.json');
    
        const response = await fetch('https://launcher.historion.wstr.fr/api/mods.json');
        const apiMods = await response.json();
        const apiModsSet = new Set(apiMods.optionalMods);
    
        let localModsConfig;
        try {
            localModsConfig = JSON.parse(fs.readFileSync(modsConfigFile));
        } catch (error) {
            await this.createModsConfig(modsConfigFile);
            localModsConfig = JSON.parse(fs.readFileSync(modsConfigFile));
        }
    
        for (const localMod in localModsConfig) {
            if (!apiModsSet.has(localMod)) {
                if (!localModsConfig[localMod]) {
                    const modFiles = fs.readdirSync(modsDir).filter(file => file.startsWith(localMod) && file.endsWith('.jar-disable'));
                    if (modFiles.length > 0) {
                        const modFile = modFiles[0];
                        const modFilePath = path.join(modsDir, modFile);
                        const newModFilePath = modFilePath.replace('.jar-disable', '.jar');
                        fs.renameSync(modFilePath, newModFilePath);
                    }
                }
                delete localModsConfig[localMod];
            }
        }
    
        apiMods.optionalMods.forEach(apiMod => {
            if (!(apiMod in localModsConfig)) {
                localModsConfig[apiMod] = true;
            }
        });
    
        fs.writeFileSync(modsConfigFile, JSON.stringify(localModsConfig, null, 2));
    }    

    async initOptionalMods() {
        const modElement = document.createElement('div');
        const modsDir = path.join(dataDirectory, '.historion', 'mods');
        const launcherConfigDir = path.join(dataDirectory, '.historion', 'launcher_config');
        const modsConfigFile = path.join(launcherConfigDir, 'mods_config.json');
        const modsListElement = document.getElementById('mods-list');

        if (!fs.existsSync(modsDir) || fs.readdirSync(modsDir).length === 0) {
            modElement.innerHTML = `
            <div class="mods-container">
              <h2>Les mods n'ont pas encore étés téléchargés. Veuillez lancer une première fois le jeu pour configurer les mods optionnels.<h2>
            </div>`
            if (!fs.existsSync(launcherConfigDir)) {
                fs.mkdirSync(launcherConfigDir, { recursive: true });
            }
            await this.createModsConfig(modsConfigFile);
        } else {
            await this.displayMods(modsConfigFile, modsDir, modsListElement);
        }
    }

    async createModsConfig(modsConfigFile) {
        const response = await fetch('https://launcher.historion.wstr.fr/api/mods.json');
        const data = await response.json();
        const modsConfig = {};
    
        data.optionalMods.forEach(mod => {
            modsConfig[mod] = true;
        });
    
        fs.writeFileSync(modsConfigFile, JSON.stringify(modsConfig, null, 2));
    }    

    async displayMods(modsConfigFile, modsDir, modsListElement) {
        let modsConfig;
    
        try {
            modsConfig = JSON.parse(fs.readFileSync(modsConfigFile));
        } catch (error) {
            await this.createModsConfig(modsConfigFile);
            modsConfig = JSON.parse(fs.readFileSync(modsConfigFile));
        }
    
        const response = await fetch('https://launcher.historion.wstr.fr/api/mods.json');
        const data = await response.json();
    
        if (!data.optionalMods || !data.mods) {
            console.error('La réponse API ne contient pas "optionalMods" ou "mods".');
            return;
        }
    
        data.optionalMods.forEach(mod => {
            const modElement = document.createElement('div');
            const modInfo = data.mods[mod];
            if (!modInfo) {
                console.error(`Les informations pour le mod "${mod}" sont manquantes dans "mods".`);
                modElement.innerHTML = `
                <div class="mods-container">
                  <h2>Les informations pour le mod ${mod} n'ont pas étés mises par les administrateurs.<h2>
                   <div class="switch">
                      <input type="checkbox" id="${mod}" name="mod" value="${mod}" ${modsConfig[mod] ? 'checked' : ''}>
                      <label class="switch-label" for="${mod}"></label>
                  </div>
                </div>`;
                return;
            }
        
            const modName = modInfo.name;
            const modDescription = modInfo.description;
            const modLink = modInfo.icon;
            const modRecommanded = modInfo.recommanded;
        
            modElement.innerHTML = `
                <div class="mods-container">
                  <img src="${modLink}" class="mods-icon" alt="${modName} logo">
                  <div class="mods-container-text">
                    <div class="mods-container-name">                    
                        <h2>${modName}</h2>
                        <div class="mods-recommanded" style="display: none;">Recommandé</div>
                    </div>
                    <div class="mod-description">${modDescription}</div>
                  </div>
                  <div class="switch">
                    <input type="checkbox" id="${mod}" name="mod" value="${mod}" ${modsConfig[mod] ? 'checked' : ''}>
                    <label class="switch-label" for="${mod}"></label>
                  </div>
                </div>
            `;
        
            if (modRecommanded) {
                modElement.querySelector('.mods-recommanded').style.display = 'block';
            }
        
            modElement.querySelector('input').addEventListener('change', (e) => {
                this.toggleMod(mod, e.target.checked, modsConfig, modsDir, modsConfigFile);
            });
        
            modsListElement.appendChild(modElement);
        });        
    }        

    async toggleMod(mod, enabled, modsConfig, modsDir, modsConfigFile) {
        const modFiles = fs.readdirSync(modsDir).filter(file => file.startsWith(mod) && (file.endsWith('.jar') || file.endsWith('.jar-disable')));
    
        if (modFiles.length > 0) {
            const modFile = modFiles[0];
            const modFilePath = path.join(modsDir, modFile);
            const newModFilePath = enabled ? modFilePath.replace('.jar-disable', '.jar') : modFilePath.replace('.jar', '.jar-disable');
    
            fs.renameSync(modFilePath, newModFilePath);
    
            modsConfig[mod] = enabled;
            fs.writeFileSync(modsConfigFile, JSON.stringify(modsConfig, null, 2));
        }
    }
      
    async initRam() {
        let ramDatabase = (await this.database.get('1234', 'ram'))?.value;
        let totalMem = Math.trunc(os.totalmem() / 1073741824 * 10) / 10;
        let freeMem = Math.trunc(os.freemem() / 1073741824 * 10) / 10;

        document.getElementById("total-ram").textContent = `${totalMem} Go`;
        document.getElementById("free-ram").textContent = `${freeMem} Go`;

        let sliderDiv = document.querySelector(".memory-slider");
        sliderDiv.setAttribute("max", Math.trunc((80 * totalMem) / 100));

        let ram = ramDatabase ? ramDatabase : { ramMin: "1", ramMax: "2" };
        let slider = new Slider(".memory-slider", parseFloat(ram.ramMin), parseFloat(ram.ramMax));

        let minSpan = document.querySelector(".slider-touch-left span");
        let maxSpan = document.querySelector(".slider-touch-right span");

        minSpan.setAttribute("value", `${ram.ramMin} Go`);
        maxSpan.setAttribute("value", `${ram.ramMax} Go`);

        slider.on("change", (min, max) => {
            minSpan.setAttribute("value", `${min} Go`);
            maxSpan.setAttribute("value", `${max} Go`);
            this.database.update({ uuid: "1234", ramMin: `${min}`, ramMax: `${max}` }, 'ram')
        });
    }

    async initJavaPath() {
        let javaDatabase = (await this.database.get('1234', 'java-path'))?.value?.path;
        let javaPath = javaDatabase ? javaDatabase : 'Utiliser la version de java livre avec le launcher';
        document.querySelector(".info-path").textContent = `${dataDirectory.replace(/\\/g, "/")}/${process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}/runtime`;

        let path = document.querySelector(".path");
        path.value = javaPath;
        let file = document.querySelector(".path-file");

        document.querySelector(".path-button").addEventListener("click", async() => {
            file.value = '';
            file.click();
            await new Promise((resolve) => {
                let interval;
                interval = setInterval(() => {
                    if (file.value != '') resolve(clearInterval(interval));
                }, 100);
            });

            if (file.value.replace(".exe", '').endsWith("java") || file.value.replace(".exe", '').endsWith("javaw")) {
                this.database.update({ uuid: "1234", path: file.value }, 'java-path');
                path.value = file.value.replace(/\\/g, "/");
            } else alert("Le nom du fichier doit être java ou javaw");

        });

        document.querySelector(".path-button-reset").addEventListener("click", () => {
            path.value = 'Utiliser la version de java livre avec le launcher';
            file.value = '';
            this.database.update({ uuid: "1234", path: false }, 'java-path');
        });
    }

    async initJavaArgs() {
        let javaArgsDatabase = (await this.database.get('1234', 'java-args'))?.value?.args;
        let argsInput = document.querySelector(".args-settings");

        if (javaArgsDatabase?.length) argsInput.value = javaArgsDatabase.join(' ');
    
        document.querySelector('.args-settings').addEventListener('change', () => {
            let args = [];
            try {
                if (argsInput.value.length) {
                    argsInput = argsInput.value.trim().split(/\s+/)
                    for(let arg of argsInput) {
                        if (arg === '') continue;
                        if (arg === '--server' || arg === '--port') continue;
                        args.push(arg);
                    }
                }
            } finally {
                this.database.update({ uuid: "1234", args: args }, 'java-args');
            }
        });
    }
  
    async initSkin() {
        let uuid = (await this.database.get('1234', 'accounts-selected')).value;
        let account = (await this.database.get(uuid.selected, 'accounts')).value;

        let title = document.querySelector('.player-skin-title');
        title.innerHTML = `Skin de ${account.name}`;

        const skin = document.querySelector('.skin-renderer-settings');
        const url = `https://minerender.org/embed/skin/?skin.url=${websiteUrl}/api/skin-api/skins/${account.name}&amp;autoResize=true&amp;shadow=true&amp;camera.position=-15,35,20&amp;controls.pan=false&amp;controls.zoom=false&amp;controls.enabled=false&amp;utm_source=mineskin&amp;utm_medium=website&amp;utm_campaign=skin_gen_url`
        skin.src = url;
    }

    async selectFile() {
        const input = document.getElementById('fileInput');
        input.click();
    
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
    
            console.log(`Selected file: ${file.name}, type: ${file.type}`);
    
            if (file.type !== 'image/png') {
                alert('The file must be a PNG image.');
                return;
            }
    
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = async () => {
                console.log(`Image dimensions: ${img.width}x${img.height}`);
    
                if (img.width !== 64 || img.height !== 64) {
                    alert('The image must be 64x64 pixels.');
                    return;
                }
    
                await this.processSkinChange(file);
            };
        };
    }
    
    async processSkinChange(file) {
        let uuid = (await this.database.get('1234', 'accounts-selected')).value;
        let account = (await this.database.get(uuid.selected, 'accounts')).value;
        const access_token = account.access_token;
    
        console.log(`Token: ${access_token}`);
        console.log(`File to upload: ${file.name}`);
    
        const formData = new FormData();
        formData.append('access_token', access_token);
        formData.append('skin', file);
    
        console.log('FormData prepared:', formData);
    
        try {
            const response = await fetch(`${websiteUrl}/api/skin-api/skins/update`, {
                method: 'POST',
                body: formData
            });
    
            const responseBody = await response();
    
            console.log('Response status:', response.status);
            console.log('Response body:', responseBody);
    
            if (response.ok) {
                console.log('Skin updated successfully!');
            } else {
                console.error('Failed to update skin. Response body:', responseBody);
            }
        } catch (error) {
            console.error('Error while updating skin:', error);
        }
    }    
    
    async initResolution() {
        let resolutionDatabase = (await this.database.get('1234', 'screen'))?.value?.screen;
        let resolution = resolutionDatabase ? resolutionDatabase : { width: "1280", height: "720" };
        
        let width = document.querySelector(".width-size");
        width.value = resolution.width;
        
        let height = document.querySelector(".height-size");
        height.value = resolution.height;
    
        let select = document.getElementById("select");
        select.addEventListener("change", (event) => {
            let resolution = select.options[select.options.selectedIndex].value.split(" x ");
            select.options.selectedIndex = 0;
            
            width.value = resolution[0];
            height.value = resolution[1];
            this.database.update({ uuid: "1234", screen: { width: resolution[0], height: resolution[1] } }, 'screen');
        });
    }

    async initLauncherSettings() {
        let launcherDatabase = (await this.database.get('1234', 'launcher'))?.value;
        let settingsLauncher = {
            uuid: "1234",
            launcher: {
                close: launcherDatabase?.launcher?.close || 'close-launcher'
            }
        }

        let closeLauncher = document.getElementById("launcher-close");
        let closeAll = document.getElementById("launcher-close-all");
        let openLauncher = document.getElementById("launcher-open");

        if(settingsLauncher.launcher.close === 'close-launcher') {
            closeLauncher.checked = true;
        } else if(settingsLauncher.launcher.close === 'close-all') {
            closeAll.checked = true;
        } else if(settingsLauncher.launcher.close === 'open-launcher') {
            openLauncher.checked = true;
        }

        closeLauncher.addEventListener("change", () => {
            if(closeLauncher.checked) {
                openLauncher.checked = false;
                closeAll.checked = false;
            }
           if(!closeLauncher.checked) closeLauncher.checked = true;
            settingsLauncher.launcher.close = 'close-launcher';
            this.database.update(settingsLauncher, 'launcher');
        })

        closeAll.addEventListener("change", () => {
            if(closeAll.checked) {
                closeLauncher.checked = false;
                openLauncher.checked = false;
            }
            if(!closeAll.checked) closeAll.checked = true;
            settingsLauncher.launcher.close = 'close-all';
            this.database.update(settingsLauncher, 'launcher');
        })

        openLauncher.addEventListener("change", () => {
            if(openLauncher.checked) {
                closeLauncher.checked = false;
                closeAll.checked = false;
            }
            if(!openLauncher.checked) openLauncher.checked = true;
            settingsLauncher.launcher.close = 'open-launcher';
            this.database.update(settingsLauncher, 'launcher');
        })
    }
    
    initTab() {
        let TabBtn = document.querySelectorAll('.tab-btn');
        let TabContent = document.querySelectorAll('.tabs-settings-content');
    
        for (let i = 0; i < TabBtn.length; i++) {
            TabBtn[i].addEventListener('click', () => {
                if (TabBtn[i].classList.contains('save-tabs-btn')) return
                for (let j = 0; j < TabBtn.length; j++) {
                    TabContent[j].classList.remove('active-tab-content');
                    TabBtn[j].classList.remove('active-tab-btn');
                }
                TabContent[i].classList.add('active-tab-content');
                TabBtn[i].classList.add('active-tab-btn');
            });
        }
    
        document.querySelector('.save-tabs-btn').addEventListener('click', () => {
            document.querySelector('.default-tab-btn').click();
            changePanel("home");
        });

        document.querySelector('.home-btn').addEventListener('click', () => {
            document.querySelector('.default-tab-btn').click();
            changePanel("home");
        });
    
        document.getElementById("github").addEventListener("click", function() {
            shell.openExternal("https://github.com/Boulldog0/LuminariaLauncher");
        });
    }

    async initSettingsDefault() {
        if (!(await this.database.getAll('accounts-selected')).length) {
            this.database.add({ uuid: "1234" }, 'accounts-selected')
        }

        if (!(await this.database.getAll('java-path')).length) {
            this.database.add({ uuid: "1234", path: false }, 'java-path')
        }

        if (!(await this.database.getAll('java-args')).length) {
            this.database.add({ uuid: "1234", args: [] }, 'java-args')
        }

        if (!(await this.database.getAll('launcher')).length) {
            this.database.add({
                uuid: "1234",
                launcher: {
                    close: 'close-launcher'
                }
            }, 'launcher')
        }

        if (!(await this.database.getAll('ram')).length) {
            this.database.add({ uuid: "1234", ramMin: "1", ramMax: "3" }, 'ram')
        }

        if (!(await this.database.getAll('screen')).length) {
            this.database.add({ uuid: "1234", screen: { width: "1280", height: "720" } }, 'screen')
        }
    }
}
export default Settings;