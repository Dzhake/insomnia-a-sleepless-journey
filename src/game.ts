import { ArchipelagoClient } from "./arhipelago/client.js";
import { Camera } from "./camera.ts";
import { Canvas } from "./canvas.ts";
import { CoreEvent, Scene } from "./core.ts";
import { HintBox } from "./hintbox.ts";
import { WorldMap } from "./map.ts";
import { Menu, MenuButton } from "./menu.ts";
import { MessageBox } from "./messagebox.ts";
import { ObjectManager } from "./objectmanager.ts";
import { ProgressManager } from "./progress.ts";
import { SaveManager } from "./savemanager.ts";
import { saveGame } from "./savepoint.ts";
import { Sprite } from "./sprite.ts";
import { Stage } from "./stage.ts";
import { TitleScreen } from "./titlescreen.ts";
import { TransitionEffectType } from "./transition.ts";
import { State } from "./types.ts";


export const THEME_VOLUME = 0.40;
export const INSIDE_THEME_VOLUME = 0.80;
export const FINAL_THEME_VOLUME = 0.40;


export const playTheme = (event: CoreEvent, inside = false, finalArea = false) => {

    let trackName = "theme";
    let vol = THEME_VOLUME;

    if (finalArea) {

        trackName = "final";
        vol = FINAL_THEME_VOLUME;
    }
    else if (inside) {

        trackName = "inside";
        vol = INSIDE_THEME_VOLUME;
    }


    event.audio.fadeInMusic(event.assets.getSample(trackName), vol, 1000);
}


export class GameScene implements Scene {


    private stage: Stage;
    private camera: Camera;
    private objects: ObjectManager;
    public message: MessageBox;
    private progress: ProgressManager;
    private worldMap: WorldMap;
    private saveManager: SaveManager;
    public hintbox: HintBox;

    private sprHeart: Sprite;

    private pauseMenu: Menu;

    private isFinalArea: boolean;


    constructor(param: any, event: CoreEvent) {

        this.message = new MessageBox(event);
        this.progress = ProgressManager.getInstance();
        this.saveManager = new SaveManager(this.progress);
        this.hintbox = new HintBox();

        this.camera = new Camera(0, 0, 160, 144);
        this.stage = new Stage(this.camera, this.progress, event);
        this.objects = new ObjectManager(this.stage, this.camera,
            this.message, this.progress,
            this.saveManager, this.hintbox, event,
            event => this.enterFinalArea(event));
        this.worldMap = new WorldMap(this.stage, this.progress, event);

        this.objects.cameraCheck(this.camera);

        let p = this.camera.getRealPosition();
        this.progress.addValueToArray("roomVisited", (p.y * Math.floor(this.stage.width / 10) + p.x) | 0, true);

        this.sprHeart = new Sprite(16, 16);

        let loc = event.localization;

        // TODO: Get names from localization
        this.pauseMenu = new Menu(
            [
                new MenuButton(loc.findValue(["pauseMenu", "0"]),
                    event => {

                        this.pauseMenu.deactivate();
                        event.audio.resumeMusic();
                    }),

                new MenuButton(loc.findValue(["pauseMenu", "1"]),
                    event => {

                        this.message.addMessages(event.localization.findValue(["respawnAtStart"]));
                        this.message.activate(0, true, event => {

                            event.audio.resumeMusic();
                            this.objects.killPlayer(event, true);
                            this.pauseMenu.deactivate();
                        });
                    }),

                new MenuButton(loc.findValue(["pauseMenu", "2"]),
                    event => {

                        this.message.addMessages(event.localization.findValue(["respawn"]));
                        this.message.activate(0, true, event => {

                            event.audio.resumeMusic();

                            this.objects.killPlayer(event);
                            this.pauseMenu.deactivate();
                        });
                    }),

                new MenuButton(loc.findValue(["pauseMenu", "3"]),
                    event => {

                        if (!this.isFinalArea) {

                            saveGame(this.message, this.saveManager, event);
                        }
                        else {

                            this.message.addMessages([event.localization.findValue(["cannotSave"])]);
                            this.message.activate();
                        }
                    }),

                new MenuButton(loc.findValue(["pauseMenu", "4"]),
                    event => {

                        if (this.activateMap(() => {
                            this.pauseMenu.activate(3);
                        }, event)) {

                            this.pauseMenu.deactivate();
                            event.audio.resumeMusic();
                        }
                    }),
                /*
                                new MenuButton("DEBUG", 
                                event => {
                
                                    this.debug();
                                    event.audio.resumeMusic();
                                }),
                */
                new MenuButton(loc.findValue(["pauseMenu", "5"]),
                    event => {

                        this.message.addMessages(loc.findValue(["quitGame"]));
                        this.message.activate(0, true, event => {

                            this.pauseMenu.deactivate();
                            event.transition.activate(true, TransitionEffectType.BoxVertical,
                                1.0 / 30.0, event => {

                                    event.changeScene(TitleScreen);
                                });
                        });
                    })
            ]
        );

        if (param != null && Number(param) == 1) {

            this.loadGame();
        }

        playTheme(event, this.objects.isPlayerInside(), this.isFinalArea);

        this.isFinalArea = false;
    }


    private debug() {

        for (let i = 0; i <= 12; ++i) {

            this.progress.addValueToArray("items", i, true);
        }
        this.progress.setBooleanProperty("fansEnabled");
        this.progress.setBooleanProperty("switchState",
            !this.progress.getBooleanProperty("switchState"));

        this.stage.toggleSpecialBlocks();

        this.pauseMenu.deactivate();

        this.objects.debugDestroyObjects();
        this.progress.setNumberProperty("kills", 99);
        this.progress.setNumberProperty("stars", 99);

        for (let i = 0; i < 99; ++i) {

            this.progress.addValueToArray("enemiesKilled", i);
            this.progress.addValueToArray("starsCollected", i);
        }
    }


    private enterFinalArea(event: CoreEvent) {

        this.isFinalArea = true;

        this.stage = new Stage(this.camera, this.progress, event, true);
        this.objects = new ObjectManager(this.stage, this.camera,
            this.message, this.progress,
            this.saveManager, this.hintbox, event);
        this.worldMap = new WorldMap(this.stage, this.progress, event);

        this.objects.cameraCheck(this.camera);

        this.objects.reinitializeObjectsByProgress(this.camera);

        playTheme(event, this.objects.isPlayerInside(), this.isFinalArea);
    }


    private loadGame() {

        let data: any;

        try {

            data = this.saveManager.load();
            if (data == null) {

                return;
            }
        }
        catch (e) {

            console.log(e);
            return;
        }

        this.progress.recoverFromJSON(data);
        this.objects.reinitializeObjectsByProgress(this.camera);
        ArchipelagoClient.getInstance().updateReceivedItems();

        if (this.progress.getBooleanProperty("switchState")) {

            this.stage.toggleSpecialBlocks();
        }
    }


    private activateMap(cb: (event: CoreEvent) => void, event: CoreEvent): boolean {

        if (this.isFinalArea) {

            this.message.addMessages([event.localization.findValue(["cannotSave"])]);
            this.message.activate();
            return false;
        }

        this.worldMap.activate(this.stage, this.objects, this.camera);

        return true;
    }


    private updateHeart(event: CoreEvent) {

        const HEARTBEAT_WAIT = 50;
        const HEARTBEAT_TIME = 10;

        this.sprHeart.animate(0, 0, 1,
            this.sprHeart.getColumn() == 0 ? HEARTBEAT_WAIT : HEARTBEAT_TIME,
            event.step);
    }


    public update(event: CoreEvent) {

        this.hintbox.update(this.camera, event);

        if (event.transition.isActive()) {

            if (this.camera.wasForcedToMove()) {

                this.objects.cameraCheck(this.camera);
            }
            return;
        }

        if (this.message.isActive()) {

            this.message.update(event);
            return;
        }

        if (this.worldMap.isActive()) {

            this.worldMap.update(event);
            return;
        }

        if (this.pauseMenu.isActive()) {

            this.pauseMenu.update(event);
            return;
        }

        if (event.input.getAction("start") == State.Pressed) {

            event.audio.playSample(event.assets.getSample("pause"), 0.40);

            event.audio.pauseMusic();

            this.pauseMenu.activate(0);
            return;
        }

        if (event.input.getAction("map") == State.Pressed) {

            event.audio.playSample(event.assets.getSample("pause"), 0.40);

            this.activateMap(() => { }, event);
            return;
        }

        this.updateHeart(event);

        if (this.camera.update(event)) {

            this.objects.checkLoop(this.stage);
            this.camera.checkLoop(this.stage);
        }
        this.stage.update(this.camera, event, this.objects.isPlayerInside());
        this.objects.update(this.stage, this.camera, event);
    }


    private drawHUD(canvas: Canvas, drawTarget = false) {

        const X_OFF = -8;

        let font = canvas.assets.getBitmap("fontBig");
        let bmpHearts = canvas.assets.getBitmap("hearts");

        let s = String(String(this.progress.getNumberProperty("stars", 0)));
        if (drawTarget)
            s += "/" + this.objects.getStarCount();

        canvas.drawText(font, ":", 2, 1, 0, 0);
        canvas.drawText(font, ";" + s, 13, 1, X_OFF, 0);

        let kills = this.progress.getNumberProperty("kills", 0);

        s = String(kills);
        if (drawTarget)
            s += "/" + this.objects.getEnemyCount();

        let shift = (s.length - 1) * (-X_OFF);

        canvas.drawText(font, "=", canvas.width - 36 - shift, 1, 0, 0);
        canvas.drawText(font, ";" + s, canvas.width - 36 + 11 - shift, 1, X_OFF, 0);

        let health = this.objects.getPlayerHealth();
        let maxHealth = this.objects.getPlayerMaxHealth();

        let sy = 0;
        let sx = 0;
        for (let i = 0; i < maxHealth; ++i) {

            sx = 0;
            sy = 16;

            if (i < health) {

                if (i == health - 1)
                    sx = this.sprHeart.getColumn() * 16;

                sy = 0;
            }

            canvas.drawBitmapRegion(bmpHearts, sx, sy, 16, 16,
                -1 + i * 12, canvas.height - 15);
        }
    }


    public redraw(canvas: Canvas) {

        canvas.moveTo();
        canvas.clear(85, 85, 85);

        this.stage.drawBackground(canvas, this.camera, this.objects.isPlayerInside());

        this.camera.use(canvas);
        canvas.applyShake();

        this.stage.draw(canvas, this.camera, this.objects.isPlayerInside());
        this.objects.draw(canvas);

        canvas.moveTo();

        this.stage.postDraw(canvas, this.objects.isPlayerInside());

        if (!this.pauseMenu.isActive())
            this.drawHUD(canvas);

        this.hintbox.draw(canvas);
        this.worldMap.draw(canvas);

        if (!this.pauseMenu.isActive())
            this.message.draw(canvas);

        if (this.pauseMenu.isActive()) {

            canvas.setFillColor(0, 0, 0, 0.67);
            canvas.fillRect();

            const items_bmp = canvas.assets.getBitmap("items");
            let dx = 0;
            let dy = 108;
            const progress: ProgressManager = ProgressManager.getInstance();

            for (let itemID = 0; itemID < 13; itemID++) {
                if (progress.doesValueExistInArray("items", itemID)) {
                    canvas.drawBitmapRegion(items_bmp, itemID * 16, 0, 16, 16, dx, dy);
                }

                dx += 16;
                if (itemID == 9) {
                    dx -= 92;
                    dy = 124;
                }
            }

            if (progress.getBooleanProperty("fansEnabled")) {
                canvas.drawBitmapRegion(canvas.assets.getBitmap("propeller"), 0, 0, 16, 16, 120, 124);
            }


            if (this.message.isActive()) {
                this.message.draw(canvas);
            }
            else {
                this.pauseMenu.draw(canvas, 0, 0, 0, 10, true);
            }

            this.drawHUD(canvas, true);
        }
    }


    public dispose = (): any => <any>null;
}
