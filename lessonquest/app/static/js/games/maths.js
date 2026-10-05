import {Quiz} from './quiz.js';
import {Flashcards} from './flashcards.js';
export class Maths {
  constructor(ctx){this.engine=ctx.settings.mode==='cards'?new Flashcards(ctx):new Quiz(ctx);}
  start(){this.engine.start();}
  key(event){this.engine.key?.(event);}
  destroy(){this.engine.destroy?.();}
}
