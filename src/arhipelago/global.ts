import { ArchipelagoClient } from "./client";

globalThis.getClient = function (): ArchipelagoClient {
    return ArchipelagoClient.getInstance();
};