import ChordParser from './parser.js';
import InputOutput from './io.js';

class ChordSage {
  constructor() {
    this.parser = new ChordParser();
    this.io = new InputOutput(this.parser);
    this.setupInput();

    this.onInputChange("C");
  }
  setupInput() {
    this.io.bindEvent('chordInput', 'input', (value) => {
      this.onInputChange(value);
    });
  }
  onInputChange(value) {
    let result = this.parser.parse(value);
    if (result === true) {
      this.io.setValue('result', this.parser.toString());
      this.io.draw(this.parser.getModel());
    } else {
      this.io.setValue('result', "What? " + result);
      this.io.draw(null);
    }
  }
}

export default ChordSage;
