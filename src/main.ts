import { AudioIntro } from "./audiointro.ts";
import { Core } from "./core.ts";
import "./arhipelago/global.ts"


window.onload = () => (new Core(160, 144))
    .run(AudioIntro, "/assets/index.json",
        event => {

            event.input
                .addAction("fire1", "KeyZ", null, 2)
                .addAction("fire2", "KeyX", null, 0)
                .addAction("fire3", "KeyC", null, 1)
                .addAction("fire4", "KeyS", null, 3)
                .addAction("select", "Space", null, 0)
                .addAction("start", "Enter", null, 9, 7)
                .addAction("map", "ShiftLeft", null, 8, 6);
        },
        event => {

            event.prepareLocalization("localization");
        });
