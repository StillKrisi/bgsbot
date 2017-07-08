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

export class Outfitting {
    public static readonly schemaId:string = "http://schemas.elite-markets.net/eddn/outfitting/2";
    private message: any;
    private systemName: string;
    private stationName: string;
    private timestamp: string;
    private modules: string[];

    constructor(message: any) {
        this.message = message;
        this.systemName = message.systemName;
        this.stationName = message.stationName;
        this.timestamp = message.timestamp;
        this.modules = message.modules;
    }

    display(): void {
        console.log(this.message);
    }
}
