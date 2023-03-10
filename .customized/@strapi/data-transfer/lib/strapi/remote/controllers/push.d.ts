/// <reference types="node" />
import { Writable } from 'stream-chain';
import type { IMetadata } from '../../../../types';
import type { TransferPushMessage, TransferPushStep } from '../../../../types/remote/protocol/client';
import { ILocalStrapiDestinationProviderOptions } from '../../providers';
export interface IPushController {
    streams: {
        [stage in TransferPushStep]?: Writable;
    };
    actions: {
        getMetadata(): Promise<IMetadata>;
        getSchemas(): Strapi.Schemas;
        bootstrap(): Promise<void>;
        close(): Promise<void>;
        beforeTransfer(): Promise<void>;
    };
    transfer: {
        [key in TransferPushStep]: <T extends TransferPushMessage>(value: T extends {
            step: key;
            data: infer U;
        } ? U : never) => Promise<void>;
    };
}
declare const createPushController: (options: ILocalStrapiDestinationProviderOptions) => IPushController;
export default createPushController;
