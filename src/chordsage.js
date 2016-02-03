import ChordParser from './parser';
import InputOutput from './io';
import _ from 'lodash';

class ChordSage {
  constructor() {
    this.config = {
      freeStrings: ['E', 'A', 'D', 'G', 'B', 'E'],
      fretSpread: 4,
      fretPosition: 1,
      chordInput: 'Dmaj7/F#'
    };
    this.parser = new ChordParser(this.config);
    this.io = new InputOutput(this.parser);
    this.setupInput();

    var that = this;
    _.each(this.config, function (value, key) {
      let input = document.getElementById(key);
      if (input) {
        input.value = value;
        if (key === 'chordInput') that.onInputChange(value);
      }
    });
  }
  setupInput() {
    this.io.bindEvent('chordInput', 'input', (value) => {
      this.onInputChange(value);
    });
    this.io.bindEvent('fretSpread', 'change', (value) => {
      this.config.fretSpread = value;
      this.onInputChange();
    });
    this.io.setValue('curPosition', this.config.fretPosition);
    this.io.bindEvent('posHigher', 'click', () => {
      if (this.config.fretPosition < 22) this.config.fretPosition++;
      this.io.setValue('curPosition', this.config.fretPosition);
      this.onInputChange();
    });
    this.io.bindEvent('posLower', 'click', () => {
      if (this.config.fretPosition > 1) this.config.fretPosition--;
      this.io.setValue('curPosition', this.config.fretPosition);
      this.onInputChange();
    });
  }
  onInputChange(value) {
    let result = value === undefined ? this.parser.reparse() : this.parser.parse(value);
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
