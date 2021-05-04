import { Message } from 'discord.js-light';

import { LangCode } from '../models/enums';
import { EventData } from '../models/internal-models';
import { MessageUtils } from '../utils';
import { Command } from './command';
import axios from 'axios';
import { Lang } from '../services';

const symbols = ['BTC', 'ETH', 'UNI', 'XRP', 'BNB', 'CAKE'];

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
            const promises = symbols.map((symbol: string) =>
                axios.get('https://api.binance.com/api/v3/ticker/24hr', {
                    params: { symbol: symbol + 'BUSD' },
                })
            );
            try {
                const results = await Promise.all(promises);
                const embed = Lang.getEmbed('displays.price', data.lang());
                const fields = [];

                const values = results
                    .map((result, i) => {
                        const priceChange = +result.data.priceChangePercent;
                        const chart = `https://th.tradingview.com/chart/?symbol=${result.data.symbol}`;
                        let arrow = ':arrow_down:';
                        if (priceChange >= 0) {
                            arrow = ':arrow_up:';
                        }
                        return `[${symbols[i]}](${chart})\t= ${(+result.data.lastPrice).toFixed(
                            3
                        )}$ ${arrow} ${Math.abs(priceChange)}%`;
                    })
                    .join('\n');
                fields.push({ name: 'Price List', value: values });
                embed.fields = fields;
                await MessageUtils.send(msg.channel, embed);
                return;
            } catch {
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
            } catch {
                message = 'Unrecognized Symbol';
            }
        }
        await MessageUtils.send(msg.channel, message);
    }
}
