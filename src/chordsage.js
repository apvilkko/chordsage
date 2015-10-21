import ChordParser from './parser';
import InputOutput from './io';

class ChordSage {
  constructor() {
    this.parser = new ChordParser();
    this.io = new InputOutput(this.parser);
    this.setupInput();

    let initialChord = "Eadd4/F#";
    var input = document.getElementById("chordInput");
    input.value = initialChord;
    this.onInputChange(initialChord);
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
      this.io.play(this.parser.getModel());
    } else {
      this.io.setValue('result', "What? " + result);
      this.io.draw(null);
    }
  }
}

export default ChordSage;
