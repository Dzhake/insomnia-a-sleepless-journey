import { Canvas } from "./canvas.ts";
import { CoreEvent, Scene } from "./core.ts";
import { GameScene } from "./game.ts";
import { MessageBox } from "./messagebox.ts";
import { TransitionEffectType } from "./transition.ts";
import { Vector2 } from "./vector.ts";


export class StoryIntro implements Scene {


    private message : MessageBox;


    constructor(param : any, event : CoreEvent) {

        this.message = new MessageBox(event);
    
        this.message.addMessages(event.localization.findValue(["storyIntro"]));
        this.message.activate(0, false, event => {

            event.transition.activate(false, TransitionEffectType.CirleIn, 
                1.0/30.0, null)
                .setCenter(new Vector2(80, 72));
                    
            event.changeScene(GameScene);
        });

        event.transition.deactivate();
    }


    public update(event : CoreEvent) {

        if (event.transition.isActive()) return;

        this.message.update(event);
    }


    public redraw(canvas : Canvas) {

        canvas.clear(0, 0, 0);

        this.message.draw(canvas, false);
    }


    public dispose = () : any => <any> false;

}
