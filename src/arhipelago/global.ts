import { Core } from "../core";
import { ArchipelagoClient } from "./client";

globalThis.getClient = function (): ArchipelagoClient {
    return ArchipelagoClient.getInstance();
};

globalThis.getCoreInstance = function (): Core {
    return Core.getInstance();
}