/*
 * KodeBlox Copyright 2017 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http: //www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as discord from 'discord.js';
import { DiscordSecrets } from '../../secrets';
import { Responses } from './responseDict';
import { Hi, Help, MyGuild, BGSRole, AdminRoles, ForbiddenRoles, BGSChannel, MonitorSystems, MonitorFactions, SystemStatus, FactionStatus, BGSReport, Sort } from './commands';
import { HelpSchema } from '../../interfaces/typings';

export class DiscordClient {
    public client: discord.Client;
    private commandsMap: Map<string, any>;

    constructor() {
        this.client = new discord.Client();
        this.commandsMap = new Map();
        this.login();
        this.listen();
    }

    public login() {
        this.client.login(DiscordSecrets.token);
    }

    public listen() {
        this.client.on("ready", () => {
            console.log("I am ready!");
            this.initiateCommands();
            this.createHelp();
        });

        this.client.on("message", (message) => {
            if (message.mentions.users.filterArray(user => {
                if (user.id === this.client.user.id) {
                    return true;
                } else {
                    return false;
                }
            }).length > 0) {
                let messageString = message.content.replace(new RegExp(`<@!?${this.client.user.id}>`), "").replace(/\s+/g, ' ').trim();
                let messageArray = messageString.split(" ");
                let command = messageArray[0].toLowerCase();
                let commandArguments: string = "";
                if (messageArray.length > 1) {
                    commandArguments = messageArray.slice(1, messageArray.length).join(" ");
                }
                if (this.commandsMap.has(command)) {
                    console.log(command + " command requested");
                    this.commandsMap.get(command).exec(message, commandArguments);
                } else {
                    message.channel.send(Responses.getResponse(Responses.NOTACOMMAND));
                }
            }
        });

        this.client.on("messageReactionAdd", (messageReaction, user) => {
            let helpObject = this.commandsMap.get('help') as Help;
            if (!user.bot && messageReaction.message.id === helpObject.helpMessageID) {
                if (!messageReaction.users.has(this.client.user.id)) {
                    messageReaction.remove(user);
                }
                helpObject.emojiCaught(messageReaction, user);
            }
        });
    }

    private initiateCommands(): void {
        this.commandsMap.set("hi", new Hi());
        this.commandsMap.set("help", new Help());
        this.commandsMap.set("myguild", new MyGuild());
        this.commandsMap.set("bgsrole", new BGSRole());
        this.commandsMap.set("adminroles", new AdminRoles());
        this.commandsMap.set("forbiddenroles", new ForbiddenRoles());
        this.commandsMap.set("bgschannel", new BGSChannel());
        this.commandsMap.set("monitorsystems", new MonitorSystems());
        this.commandsMap.set("monitorfactions", new MonitorFactions());
        this.commandsMap.set("systemstatus", new SystemStatus());
        this.commandsMap.set("factionstatus", new FactionStatus());
        this.commandsMap.set("bgsreport", new BGSReport());
        this.commandsMap.set("sort", new Sort());
    }

    createHelp(): void {
        this.commandsMap.forEach((value, key) => {
            let helpArray: [string, string, string, string[]] = value.help();
            let helpObject: HelpSchema = {
                command: helpArray[0],
                helpMessage: helpArray[1],
                template: helpArray[2],
                example: helpArray[3]
            }
            this.commandsMap.get('help').addHelp(helpObject);
        });
    }
}
