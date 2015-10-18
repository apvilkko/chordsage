class InputOutput {
  constructor(parser) {
    this.parser = parser;
  }
  bindEvent(elementId, eventName, callback) {
    let element = document.getElementById(elementId);
    element.addEventListener(eventName, (event) => {
      callback(event.target.value);
    })
  }
  setValue(key, value) {
    let element = document.getElementById(key);
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    var text = document.createTextNode(value);
    element.appendChild(text);
  }
  draw(model) {
    var canvas = document.getElementById('canvas');
    var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
    var ctx = renderer.getContext();
    ctx.clearRect(0,0,canvas.width, canvas.height);
    if (!model) {
      return;
    }
    var stave = new Vex.Flow.Stave(10, 0, 200);
    stave.addClef("treble").setContext(ctx).draw();
    var octave;
    if (model.bass) {
      octave = (model.bass === 'A' || model.bass === 'B') ? 2 : 3;
      var stave2 = new Vex.Flow.Stave(10, 80, 200);
      stave2.addClef("bass").setContext(ctx).draw();
      var voice2 = new Vex.Flow.Voice({num_beats: 4, beat_value: 4, resolution: Vex.Flow.RESOLUTION});
      let bassAcc = model.bassModifier ? model.bassModifier : '';
      var staveNote2 = new Vex.Flow.StaveNote({keys: [
        model.bass + bassAcc + "/" + octave
      ], duration: "w", clef: "bass"});
      if (bassAcc) {
        staveNote2.addAccidental(0, new Vex.Flow.Accidental(bassAcc));
      }
      voice2.addTickables([staveNote2]);
      var formatter2 = new Vex.Flow.Formatter().joinVoices([voice2]).format([voice2], 100);
      voice2.draw(ctx, stave2);
    }
    var notes = [];
    octave = 3;
    var lastNote = null;
    for (let i = 0; i < model.notes.length; ++i) {
      let acc = model.notes[i].accidental ? model.notes[i].accidental : '';
      if (i === 0 && model.notes[i].note !== 'A' && model.notes[i].note !== 'B') {
        octave = 4;
      }
      if (this.parser.octaveChanged(lastNote, model.notes[i].note)) {
        octave++;
      }
      notes.push(model.notes[i].note + acc + "/" + octave);
      lastNote = model.notes[i].note;
    }
    if (notes.length > 0) {
      var staveNote = new Vex.Flow.StaveNote({keys: notes, duration: "w"});
      for (let i = 0; i < model.notes.length; ++i) {
        if (model.notes[i].accidental) {
          staveNote.addAccidental(i, new Vex.Flow.Accidental(model.notes[i].accidental));
        }
      }
      var voice = new Vex.Flow.Voice({num_beats: 4, beat_value: 4, resolution: Vex.Flow.RESOLUTION});
      voice.addTickables([staveNote]);
      var formatter = new Vex.Flow.Formatter().joinVoices([voice]).format([voice], 100);
      voice.draw(ctx, stave);
    }
  }
}

export default InputOutput;
