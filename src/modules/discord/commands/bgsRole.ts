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
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db/index';
import { Access } from './../access';

export class BGSRole {
    db: DB;
    constructor() {
        this.db = App.db;
    }
    exec(message: discord.Message, commandArguments: string): void {
        let argsArray: string[] = [];
        if (commandArguments.length !== 0) {
            argsArray = commandArguments.split(" ");
        }
        if (argsArray.length > 0) {
            let command = argsArray[0].toLowerCase();
            if (this[command]) {
                this[command](message, argsArray);
            } else {
                message.channel.send(Responses.getResponse(Responses.NOTACOMMAND));
            }
        } else {
            message.channel.send(Responses.getResponse(Responses.NOPARAMS));
        }
    }

    set(message: discord.Message, argsArray: string[]) {
        Access.has(message.member, [Access.ADMIN, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length === 2) {
                    let guildId = message.guild.id;
                    let bgsRoleId = argsArray[1];

                    if (message.guild.roles.has(bgsRoleId)) {
                        this.db.model.guild.findOneAndUpdate(
                            { guild_id: guildId },
                            {
                                updated_at: new Date(),
                                bgs_role_id: bgsRoleId
                            })
                            .then(guild => {
                                if (guild) {
                                    message.channel.send(Responses.getResponse(Responses.SUCCESS));
                                } else {
                                    message.channel.send(Responses.getResponse(Responses.FAIL))
                                        .then(() => {
                                            message.channel.send("Your guild is not set yet");
                                        })
                                        .catch(err => {
                                            console.log(err);
                                        });
                                }
                            })
                            .catch(err => {
                                message.channel.send(Responses.getResponse(Responses.FAIL));
                                console.log(err);
                            })
                    } else {
                        message.channel.send(Responses.getResponse(Responses.IDNOTFOUND));
                    }
                } else if (argsArray.length > 2) {
                    message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
                } else {
                    message.channel.send(Responses.getResponse(Responses.NOPARAMS));
                }
            })
            .catch(() => {
                message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
            })
    }

    remove(message: discord.Message, argsArray: string[]) {
        Access.has(message.member, [Access.ADMIN, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length === 1) {
                    let guildId = message.guild.id;

                    this.db.model.guild.findOneAndUpdate(
                        { guild_id: guildId },
                        {
                            updated_at: new Date(),
                            $unset: { bgs_role_id: 1 }
                        })
                        .then(guild => {
                            if (guild) {
                                message.channel.send(Responses.getResponse(Responses.SUCCESS));
                            } else {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("Your guild is not set yet");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            }
                        })
                        .catch(err => {
                            message.channel.send(Responses.getResponse(Responses.FAIL));
                            console.log(err);
                        })
                } else {
                    message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
                }
            })
            .catch(() => {
                message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
            })
    }

    show(message: discord.Message, argsArray: string[]) {
        Access.has(message.member, [Access.ADMIN, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length === 1) {
                    let guildId = message.guild.id;

                    this.db.model.guild.findOne({ guild_id: guildId })
                        .then(guild => {
                            if (guild) {
                                if (guild.bgs_role_id && guild.bgs_role_id.length !== 0) {
                                    let embed = new discord.RichEmbed();
                                    embed.setTitle("BGS Role");
                                    embed.setColor([255, 0, 255]);
                                    let id = `${guild.bgs_role_id} - @${message.guild.roles.get(guild.bgs_role_id).name}\n`;
                                    embed.addField("Ids and Names", id);
                                    embed.setTimestamp(new Date());
                                    message.channel.send(embed)
                                        .catch(err => {
                                            console.log(err);
                                        });
                                } else {
                                    message.channel.send(Responses.getResponse(Responses.FAIL))
                                        .then(() => {
                                            message.channel.send("You don't have a bgs role set up");
                                        })
                                        .catch(err => {
                                            console.log(err);
                                        });
                                }
                            } else {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("Your guild is not set yet");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            }
                        })
                        .catch(err => {
                            message.channel.send(Responses.getResponse(Responses.FAIL));
                            console.log(err);
                        })
                } else if (argsArray.length > 1) {
                    message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
                } else {
                    message.channel.send(Responses.getResponse(Responses.NOPARAMS));
                }
            })
            .catch(() => {
                message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
            })
    }

    help() {
        return [
            'bgsrole',
            'Sets, removes or shows the role set up for using the general commands of BGSBot',
            'bgsrole <set|remove|show> <role id>',
            [
                '`@BGSBot bgsrole set 123456789012345678`',
                '`@BGSBot bgsrole remove`',
                '`@BGSBot bgsrole show`'
            ]
        ];
    }
}
