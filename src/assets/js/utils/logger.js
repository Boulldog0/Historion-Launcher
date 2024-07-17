/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

let console_log = console.log;
let console_info = console.info;
let console_warn = console.warn;
let console_debug = console.debug;
let console_error = console.error;

let totalLogs = 0;

const log_color = "#fff";
const info_color = "#fff";
const warn_color = "#CA5F00";
const error_color = "#CA0000";
const debug_color = "#CAB800";

class Logger {
    constructor(name, color) {
        this.name = name;
        this.color = color;
        this.setupConsoleMethods();
    }

    setupConsoleMethods() {
        console.log = (value) => {
            this.appendLog(value, log_color);
            console_log.call(console, `%c[${this.name}]:`, `color: ${this.color};`, value);
        };

        console.info = (value) => {
            this.appendLog(value, info_color);
            console_info.call(console, `%c[${this.name}]:`, `color: ${this.color};`, value);
        };

        console.warn = (value) => {
            this.appendLog(value, warn_color);
            console_warn.call(console, `%c[${this.name}]:`, `color: ${this.color};`, value);
        };

        console.debug = (value) => {
            this.appendLog(value, debug_color);
            console_debug.call(console, `%c[${this.name}]:`, `color: ${this.color};`, value);
        };

        console.error = (value) => {
            this.appendLog(value, error_color);
            console_error.call(console, `%c[${this.name}]:`, `color: ${this.color};`, value);
        };
    }

    async appendLog(message, color) {
        totalLogs += 1;
        const logContainers = document.querySelectorAll('.console');
        const counter = document.querySelectorAll('.console-log-counter');
        counter.forEach(counter => {
            counter.innerHTML = `${totalLogs} logs affichés`;
        });

        if (logContainers.length > 0) {
            const lines = message.split('\n');
            if (lines.length > 1 || message.length > 120) {
                const expandableLog = document.createElement('details');
                expandableLog.style.marginBottom = '5px';
                const summary = document.createElement('summary');
                summary.textContent = `[${this.name}]: ${lines[0]}`;
                summary.style.color = color;
                expandableLog.appendChild(summary);

                const logText = document.createElement('pre');
                logText.textContent = message;
                expandableLog.appendChild(logText);

                logContainers.forEach(container => {
                    container.appendChild(expandableLog.cloneNode(true));
                    container.scrollTop = container.scrollHeight;
                });
            } else {
                const logMessage = document.createElement('div');
                logMessage.style.color = color;
                logMessage.style.marginBottom = '5px';
                logMessage.textContent = `[${this.name}]: ${message}`;

                logContainers.forEach(container => {
                    container.appendChild(logMessage.cloneNode(true));
                    container.scrollTop = container.scrollHeight;
                });
            }

            const clearBtn = document.querySelectorAll('.console-clear-btn');
            clearBtn.forEach(clearBtn => {
                clearBtn.addEventListener('click', () => {
                    this.clearLogs();
                });
            })
        }
    }

    async clearLogs() {
        const logContainers = document.querySelectorAll('.console');
        logContainers.forEach(container => {
            container.innerHTML = '';
        });
        totalLogs = 0;
        const counter = document.querySelector('.console-log-counter');
        counter.innerHTML = `${totalLogs} logs affichés`;
        
        console.log(`[${this.name}] Console cleared!`);
    }
}

export default Logger;
