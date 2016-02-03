class InputOutput {
  constructor(parser) {
    this.parser = parser;
    this.initMIDI();
  }
  bindEvent(elementId, eventName, callback) {
    let element = document.getElementById(elementId);
    element.addEventListener(eventName, (event) => {
      callback(event.target.value);
    });
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
    let stave = new Vex.Flow.Stave(10, 0, 200);
    stave.addClef("treble").setContext(ctx).draw();
    var notes = [];
    for (let i = 0; i < model.notes.length; ++i) {
      notes.push(model.notes[i].vexNote);
    }
    let voice;
    if (notes.length > 0) {
      var staveNote = new Vex.Flow.StaveNote({keys: notes, duration: "w"});
      for (let i = 0; i < model.notes.length; ++i) {
        if (model.notes[i].accidental) {
          staveNote.addAccidental(i, new Vex.Flow.Accidental(model.notes[i].accidental));
        }
      }
      voice = new Vex.Flow.Voice({num_beats: 1, beat_value: 1, resolution: Vex.Flow.RESOLUTION});
      voice.addTickables([staveNote]);
    }
    let voice2 = null;
    let stave2;
    if (model.bass) {
      stave2 = new Vex.Flow.Stave(10, 80, 200);
      stave2.addClef("bass").setContext(ctx).draw();
      voice2 = new Vex.Flow.Voice({num_beats: 1, beat_value: 1, resolution: Vex.Flow.RESOLUTION});
      let bassAcc = model.bassModifier ? model.bassModifier : '';
      var staveNote2 = new Vex.Flow.StaveNote({
        keys: [model.bassNote.vexNote],
        duration: "w",
        clef: "bass"
      });
      if (bassAcc) {
        staveNote2.addAccidental(0, new Vex.Flow.Accidental(bassAcc));
      }
      voice2.addTickables([staveNote2]);
    }
    let formatter;
    if (voice2) {
      formatter = new Vex.Flow.Formatter().joinVoices([voice]).format([voice, voice2]);
      voice.draw(ctx, stave);
      voice2.draw(ctx, stave2);
    } else if (voice) {
      formatter = new Vex.Flow.Formatter().joinVoices([voice]).format([voice]);
      voice.draw(ctx, stave);
    }
    this.drawGuitarTab(model);
  }
  drawGuitarTab(model) {
    let element = document.getElementById('tab');
    let size = '7';
    element.innerHTML = '&nbsp;';
    //element.setAttribute('data-chord', model.guitar + ' [123456] ' + size);
    element.setAttribute('data-chord', model.guitar + ' ' + size);
    setTimeout(function() {
      Chord.render([element]);
    });
  }
  initMIDI() {
    MIDI.loadPlugin({
      soundfontUrl: "./lib/midi-js/soundfont/",
      instrument: "acoustic_grand_piano",
      onprogress: function(state, progress) {
        //console.log(state, progress);
      },
      onsuccess: () => {
        this.midiReady = true;
        if (this.defer) {
          this.play(this.defer);
          this.defer = null;
        }
      }
    });
  }
  play(model) {
    if (this.midiReady) {
      MIDI.stopAllNotes();
      let velocity = 127;
      MIDI.setVolume(0, 127);
      let notes = model.bass ? [model.bassNote.midiNote] : [];
      for (let i = 0; i < model.notes.length; ++i) {
        notes.push(model.notes[i].midiNote);
      }
      for (let i = 0; i < notes.length; ++i) {
        MIDI.noteOn(0, notes[i], velocity, 0);
        MIDI.noteOff(0, notes[i], 5);
      }
    } else {
      this.defer = model;
    }
  }
}

export default InputOutput;
