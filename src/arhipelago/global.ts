import { Core } from "../core";
import { ArchipelagoClient } from "./client";
import { Player } from "../player";

globalThis.getClient = function (): ArchipelagoClient {
    return ArchipelagoClient.getInstance();
};

globalThis.getCoreInstance = function (): Core {
    return Core.getInstance();
}

globalThis.getPlayer = function (): Player {
    return Player.getInstance();
}