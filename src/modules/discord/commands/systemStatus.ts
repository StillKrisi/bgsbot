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
import * as request from 'request';
import * as moment from 'moment';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db/index';
import { Access } from './../access';
import { EBGSFactionsV4WOHistory, EBGSSystemsV4WOHistory, FieldRecordSchema } from "../../../interfaces/typings";
import { OptionsWithUrl } from 'request';

export class SystemStatus {
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

    get(message: discord.Message, argsArray: string[]): void {
        Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length >= 2) {
                    let systemName: string = argsArray.slice(1).join(" ").toLowerCase();

                    let requestOptions: OptionsWithUrl = {
                        url: "http://elitebgs.kodeblox.com/api/ebgs/v4/systems",
                        method: "GET",
                        qs: { name: systemName },
                        json: true
                    }

                    request(requestOptions, (error, response, body: EBGSSystemsV4WOHistory) => {
                        if (!error && response.statusCode == 200) {
                            if (body.total === 0) {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("System not found");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            } else {
                                let responseSystem = body.docs[0];
                                let systemName = responseSystem.name;
                                let systemState = responseSystem.state;
                                let controlling = responseSystem.controlling_minor_faction;
                                let minorFactions = responseSystem.factions;
                                if (systemState === null) {
                                    systemState = "None";
                                }
                                let factionPromises: Promise<[string, string, string, number]>[] = [];
                                minorFactions.forEach((faction) => {
                                    let requestOptions: OptionsWithUrl = {
                                        url: "http://elitebgs.kodeblox.com/api/ebgs/v4/factions",
                                        method: "GET",
                                        qs: { name: faction.name_lower },
                                        json: true
                                    }
                                    factionPromises.push(new Promise((resolve, reject) => {
                                        request(requestOptions, (error, response, body: EBGSFactionsV4WOHistory) => {
                                            if (!error && response.statusCode == 200) {
                                                if (body.total === 0) {
                                                    message.channel.send(Responses.getResponse(Responses.FAIL))
                                                        .then(() => {
                                                            resolve([faction.name, "Faction status not found", faction.name, 0]);
                                                        })
                                                        .catch(err => {
                                                            console.log(err);
                                                        });
                                                } else {
                                                    let responseFaction = body.docs[0];
                                                    let factionName = responseFaction.name;
                                                    let factionNameLower = responseFaction.name_lower;
                                                    let systemIndex = responseFaction.faction_presence.findIndex(element => {
                                                        return element.system_name_lower === systemName.toLowerCase();
                                                    });
                                                    let state = responseFaction.faction_presence[systemIndex].state;
                                                    let influence = responseFaction.faction_presence[systemIndex].influence;
                                                    let pendingStatesArray = responseFaction.faction_presence[systemIndex].pending_states;
                                                    let recoveringStatesArray = responseFaction.faction_presence[systemIndex].recovering_states;
                                                    let updatedAt = moment(responseSystem.updated_at);
                                                    let factionDetail = "";
                                                    factionDetail += `Last Updated : ${updatedAt.fromNow()} \n`;
                                                    factionDetail += `State : ${state}\n`;
                                                    factionDetail += `Influence : ${(influence * 100).toFixed(1)}%\n`;
                                                    let pendingStates: string = "";
                                                    if (pendingStatesArray.length === 0) {
                                                        pendingStates = "None";
                                                    } else {
                                                        pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
                                                            let trend = this.getTrendIcon(pendingState.trend);
                                                            pendingStates = `${pendingStates}${pendingState.state}${trend}`;
                                                            if (index !== factionPendingStates.length - 1) {
                                                                pendingStates = `${pendingStates}, `
                                                            }
                                                        });
                                                    }
                                                    factionDetail += `Pending States : ${pendingStates}\n`;
                                                    let recoveringStates: string = "";
                                                    if (recoveringStatesArray.length === 0) {
                                                        recoveringStates = "None";
                                                    } else {
                                                        recoveringStatesArray.forEach((recoveringState, index, factionRecoveringState) => {
                                                            let trend = this.getTrendIcon(recoveringState.trend);
                                                            recoveringStates = `${recoveringStates}${recoveringState.state}${trend}`;
                                                            if (index !== factionRecoveringState.length - 1) {
                                                                recoveringStates = `${recoveringStates}, `
                                                            }
                                                        })
                                                    }
                                                    factionDetail += `Recovering States : ${recoveringStates}`;
                                                    if (controlling === factionNameLower) {
                                                        resolve([factionName + '* CONTROLLING FACTION', factionDetail, factionName, influence]);
                                                    } else {
                                                        resolve([factionName, factionDetail, factionName, influence]);
                                                    }
                                                }
                                            } else {
                                                if (error) {
                                                    reject(error);
                                                } else {
                                                    reject(response.statusMessage);
                                                }
                                            }
                                        });
                                    }));
                                });
                                Promise.all(factionPromises)
                                    .then(factions => {
                                        let fieldRecord: FieldRecordSchema[] = [];
                                        factions.forEach(field => {
                                            fieldRecord.push({
                                                fieldTitle: field[0],
                                                fieldDescription: field[1],
                                                influence: field[3],
                                                name: field[2]
                                            });
                                        });
                                        this.db.model.guild.findOne({ guild_id: message.guild.id })
                                            .then(guild => {
                                                if (guild) {
                                                    if (guild.sort && guild.sort_order && guild.sort_order !== 0) {
                                                        fieldRecord.sort((a, b) => {
                                                            if (guild.sort === 'name') {
                                                                if (guild.sort_order === -1) {
                                                                    if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                                                        return 1;
                                                                    } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                                                        return -1;
                                                                    } else {
                                                                        return 0;
                                                                    }
                                                                } else if (guild.sort_order === 1) {
                                                                    if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                                                        return -1;
                                                                    } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                                                        return 1;
                                                                    } else {
                                                                        return 0;
                                                                    }
                                                                } else {
                                                                    return 0;
                                                                }
                                                            } else if (guild.sort === 'influence') {
                                                                if (guild.sort_order === -1) {
                                                                    return b.influence - a.influence;
                                                                } else if (guild.sort_order === 1) {
                                                                    return a.influence - b.influence;
                                                                } else {
                                                                    return 0;
                                                                }
                                                            } else {
                                                                return 0;
                                                            }
                                                        });
                                                    }
                                                    // Multipage is not needed for systems due to number of faction restriction but still keeping it
                                                    (async (message, fieldRecord) => {
                                                        let numberOfMessages = Math.ceil(fieldRecord.length / 24);
                                                        for (let index = 0; index < numberOfMessages; index++) {
                                                            let embed = new discord.RichEmbed();
                                                            if (index === 0) {
                                                                embed.setTitle("SYSTEM STATUS");
                                                            } else {
                                                                embed.setTitle(`SYSTEM STATUS - continued - Pg ${index + 1}`);
                                                            }
                                                            embed.setColor([255, 0, 255]);
                                                            embed.addField(systemName, systemState, false);
                                                            embed.setTimestamp(new Date());
                                                            let limit = 0;
                                                            if (fieldRecord.length > index * 24 + 24) {
                                                                limit = index * 24 + 24;
                                                            } else {
                                                                limit = fieldRecord.length;
                                                            }
                                                            for (let recordIndex = index * 24; recordIndex < limit; recordIndex++) {
                                                                embed.addField(fieldRecord[recordIndex].fieldTitle, fieldRecord[recordIndex].fieldDescription);
                                                            }
                                                            try {
                                                                await message.channel.send(embed);
                                                            } catch (err) {
                                                                console.log(err);
                                                            }
                                                        }
                                                    })(message, fieldRecord);
                                                }
                                            })
                                            .catch(err => {
                                                message.channel.send(Responses.getResponse(Responses.FAIL));
                                                console.log(err);
                                            });
                                    })
                                    .catch(err => {
                                        message.channel.send(Responses.getResponse(Responses.FAIL));
                                        console.log(err);
                                    });
                            }
                        } else {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log(response.statusMessage);
                            }
                        }
                    })
                }
            })
    }

    private getTrendIcon(trend: number): string {
        if (trend > 0) {
            return "⬆️";
        } else if (trend < 0) {
            return "⬇️";
        } else {
            return "↔️";
        }
    }

    help() {
        return [
            'systemStatus',
            'Gets the details of a system',
            'systemStatus get <system name>',
            [
                '`@BGSBot systemStatus get qa\'wakana`'
            ]
        ];
    }
}
