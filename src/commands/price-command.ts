import { Message } from 'discord.js-light';

import { LangCode } from '../models/enums';
import { EventData } from '../models/internal-models';
import { MessageUtils } from '../utils';
import { Command } from './command';
import axios from 'axios';
import { Lang } from '../services';

const binanceSymbols = ['BTC', 'ETH', 'UNI', 'XRP', 'BNB', 'CAKE'];
const bitkubSymbols = ['BTC', 'ETH', 'UNI', 'XRP', 'BNB'];

export class PriceCommand implements Command {
    public requireGuild = false;
    public requirePerms = [];

    public keyword(langCode: LangCode): string {
        return '!price';
    }

    public regex(langCode: LangCode): RegExp {
        return /^!price$/;
    }

    public async execute(msg: Message, args: string[], data: EventData): Promise<void> {
        let message: string;

        if (args.length === 1) {
            const binancePromises = binanceSymbols.map((symbol: string) =>
                axios.get('https://api.binance.com/api/v3/ticker/24hr', {
                    params: { symbol: symbol + 'BUSD' },
                })
            );
            const bitkubPromises = bitkubSymbols.map((symbol: string) =>
                axios.get('https://api.bitkub.com/api/market/ticker', {
                    params: { sym: 'THB_' + symbol },
                })
            );
            try {
                const binanceResults = await Promise.all(binancePromises);
                const bitkubResults = await Promise.all(bitkubPromises);
                const embed = Lang.getEmbed('displays.price', data.lang());
                const fields = [];

                const binanceValues = binanceResults.map((result, i) => {
                    const priceChange = +result.data.priceChangePercent;
                    const chart = `https://th.tradingview.com/chart/?symbol=${result.data.symbol}`;
                    let arrow = ':arrow_down:';
                    if (priceChange >= 0) {
                        arrow = ':arrow_up:';
                    }
                    return `[${result.data.symbol}](${chart})\t= ${(+result.data.lastPrice).toFixed(
                        3
                    )}$ ${arrow} ${Math.abs(priceChange)}%`;
                });
                const bitkubValues = bitkubResults.map((result, i) => {
                    const symbol = 'THB_' + bitkubSymbols[i];
                    const data = result.data[symbol];
                    const priceChange = +data.percentChange;
                    const chart = `https://www.bitkub.com/market/${bitkubSymbols[i]}`;
                    let arrow = ':arrow_down:';
                    if (priceChange >= 0) {
                        arrow = ':arrow_up:';
                    }
                    return `[${symbol}](${chart})\t= ${+result.data.last}฿ ${arrow} ${Math.abs(
                        priceChange
                    )}%`;
                });
                const values = [];
                for (const [i, value] of binanceValues.entries()) {
                    values.push(value);
                    if (i < bitkubValues.length) {
                        values.push(bitkubValues[i]);
                    }
                }
                fields.push({ name: 'Price List', value: values });
                embed.fields = fields;
                await MessageUtils.send(msg.channel, embed);
                return;
            } catch (error) {
                console.log('error: ', error);
                message = 'Unrecognized Symbol';
            }
        } else {
            try {
                const result = await axios.get('https://api.binance.com/api/v3/ticker/price', {
                    params: { symbol: args[1] },
                });
                if (result.data?.symbol) {
                    message = `${result.data.symbol} = ${(+result.data.price).toFixed(3)}`;
                } else {
                    message = 'Unrecognized Symbol';
                }
            } catch (error) {
                console.log(error);
                message = 'Unrecognized Symbol';
            }
        }
        await MessageUtils.send(msg.channel, message);
    }
}
