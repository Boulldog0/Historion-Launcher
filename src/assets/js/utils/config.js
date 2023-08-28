/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

const pkg = require('../package.json');
const fetch = require("node-fetch")
const convert = require("xml-js")
let settings_url = pkg.user ? `${pkg.settings}/${pkg.user}` : pkg.settings

let config = `${settings_url}/utils/api`;



class Config {
    GetConfig() {
        return new Promise((resolve, reject) => {
            fetch(config).then(config => {
                return resolve(config.json());
            }).catch(error => {
                return reject(error);
            })
        })
    }
    async GetNews() {
        this.config = await this.GetConfig().then(res => res);
        let news = `${this.config.azauth}/api/rss`
        let rss = await fetch(news).then(res => res.text());
        let rssparse = JSON.parse(convert.xml2json(rss, { compact: true }));
        let data = [];
    
        // Vérifier si des articles sont disponibles
        if (rssparse.rss.channel.item) {
            // Si c'est un tableau, parcourir chaque élément
            if (Array.isArray(rssparse.rss.channel.item)) {
                for (let i of rssparse.rss.channel.item) {
                    let item = {}
                    item.title = i.title._text;
                    item.content = i['content:encoded']._text;
                    item.author = i['dc:creator']._text;
                    item.publish_date = i.pubDate._text;
                    data.push(item);
                }
            } else {
                // Sinon, il n'y a qu'un seul article, traitez-le comme un tableau
                let item = {}
                item.title = rssparse.rss.channel.item.title._text;
                item.content = rssparse.rss.channel.item['content:encoded']._text;
                item.author = rssparse.rss.channel.item['dc:creator']._text;
                item.publish_date = rssparse.rss.channel.item.pubDate._text;
                data.push(item);
            }
        } else {
            // Aucun article disponible, ajoutez un message ou faites autre chose
            data.push({
                title: "Aucun article disponible",
                content: "Aucun article n'a été trouvé.",
                author: "News",
                publish_date: "2023"
            });
        }
    
        return data;
    }
    
}

export default new Config;
