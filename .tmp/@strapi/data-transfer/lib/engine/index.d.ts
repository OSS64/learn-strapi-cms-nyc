/// <reference types="node" />
import { PassThrough } from 'stream';
import type { IDestinationProvider, ISourceProvider, ITransferEngine, ITransferEngineOptions, TransferProgress, ITransferResults, TransferStage, TransferFilters, TransferFilterPreset } from '../../types';
import { IDiagnosticReporter } from './diagnostic';
export declare const TRANSFER_STAGES: ReadonlyArray<TransferStage>;
export declare type TransferGroupFilter = Record<TransferFilterPreset, TransferFilters>;
/**
 * Preset filters for only/exclude options
 * */
export declare const TransferGroupPresets: TransferGroupFilter;
export declare const DEFAULT_VERSION_STRATEGY = "ignore";
export declare const DEFAULT_SCHEMA_STRATEGY = "strict";
declare class TransferEngine<S extends ISourceProvider = ISourceProvider, D extends IDestinationProvider = IDestinationProvider> implements ITransferEngine {
    #private;
    sourceProvider: ISourceProvider;
    destinationProvider: IDestinationProvider;
    options: ITransferEngineOptions;
    progress: {
        data: TransferProgress;
        stream: PassThrough;
    };
    diagnostics: IDiagnosticReporter;
    constructor(sourceProvider: S, destinationProvider: D, options: ITransferEngineOptions);
    shouldSkipStage(stage: TransferStage): boolean;
    init(): Promise<void>;
    /**
     * Run the bootstrap method in both source and destination providers
     */
    bootstrap(): Promise<void>;
    /**
     * Run the close method in both source and destination providers
     */
    close(): Promise<void>;
    integrityCheck(): Promise<void>;
    transfer(): Promise<ITransferResults<S, D>>;
    beforeTransfer(): Promise<void>;
    transferSchemas(): Promise<void>;
    transferEntities(): Promise<void>;
    transferLinks(): Promise<void>;
    transferAssets(): Promise<void>;
    transferConfiguration(): Promise<void>;
}
export declare const createTransferEngine: <S extends ISourceProvider, D extends IDestinationProvider>(sourceProvider: S, destinationProvider: D, options: ITransferEngineOptions) => TransferEngine<S, D>;
export {};
