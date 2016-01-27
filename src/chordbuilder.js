import _ from '../node_modules/lodash';

var NOTES = {
  'B#': 0,
  'C': 0,
  'Dbb': 0,
  'C#': 1,
  'Db': 1,
  'D': 2,
  'Ebb': 2,
  'C##': 2,
  'D#': 3,
  'Eb': 3,
  'E': 4,
  'D##': 4,
  'Fb': 4,
  'E#': 5,
  'F': 5,
  'Gbb': 5,
  'F#': 6,
  'Gb': 6,
  'G': 7,
  'Abb': 7,
  'F##': 7,
  'G#': 8,
  'Ab': 8,
  'A': 9,
  'G##': 9,
  'Bbb': 9,
  'A#': 10,
  'Bb': 10,
  'B': 11,
  'A##': 11,
  'Cb': 11,
};

var ROOTS = {
  'C': 0,
  'D': 1,
  'E': 2,
  'F': 3,
  'G': 4,
  'A': 5,
  'B': 6
};


function absToNote(absNote, originalRoot, rd, quality, role) {
  //console.log("absToNote", absNote, originalRoot, rd, quality, role);
  var inverted = _.invert(NOTES, true);
  while (absNote > 11) {
    absNote -= 12;
  }
  var choices = inverted[absNote];
  //console.log(absNote, choices);
  return _(choices).filter(function (item) {
    var rootDistance = ROOTS[item[0]] - ROOTS[originalRoot];
    if (rootDistance < 0) {
      rootDistance += 7;
    }
    //console.log(item[0], originalRoot, rd, rootDistance);
    var fifth = (rd >= 6 && rd <= 8) && rootDistance === 4;
    var seventh = (rd >= 10 && rd <= 11) && rootDistance === 6;
    var ninth = (rd >= 13 && rd <= 15) && rootDistance === 1;
    var eleventh = (rd >= 17 && rd <= 18) && rootDistance === 3;
    var thirteenth = (rd >= 20 && rd <= 21) && rootDistance === 5;
    var dimSeventh = (rd === 9) && rootDistance === 6 && quality === 'dim';
    var sixth = (rd >= 8 && rd <= 9) && rootDistance === 5 && quality !== 'dim' && quality !== 'aug';
    var third = (rd >= 3 && rd <= 4) && rootDistance === 2;
    var second = (rd >= 1 && rd <= 2) && rootDistance === 1;
    var fourth = (rd >= 5 && rd <= 6) && rootDistance === 3 && quality !== 'dim' && role !== 'fifth';
    return fifth || third || fourth || sixth || seventh || dimSeventh || second || ninth || eleventh || thirteenth;
  }).first();
}

function getAbsNote(root, acc) {
  return NOTES[root + (acc ? acc : '')];
}

function getDistance(from, to) {
  let a = NOTES[from];
  let b = getAbsNote(to.note, to.accidental);
  return b >= a ? (b - a) : (b - a + 12);
}

function getNote(model, distance, role) {
  var root = model.root;
  var acc = model.rootModifier;
  var absNote = getAbsNote(root, acc);
  var newNote = absNote + distance;
  var newClean = absToNote(newNote, root, distance, model.quality, role);
  if (!newClean && distance === 0) {
    newClean = model.root + (model.rootModifier ? model.rootModifier : '');
  }
  if (!newClean) {
    throw new Error("bad note" + " " + root + " " + acc + " " + distance + " " + role);
  }
  return {
    note: newClean[0],
    accidental: newClean.length > 1 ? newClean.substr(1) : null,
    role: role
  };
}

var INTERVAL = {
  4: 5,
  5: 7,
  9: 14,
  11: 17
};

function getSeventh(model) {
  return model.quality === 'maj' ? 11 : 10;
}

function getExtraNote(note, chord) {
  //console.log("getExtraNote", note, chord);
  var distance = adjustWithAccidental(INTERVAL[note.interval], note.accidental);
  return getNote(chord, distance, note.interval);
}

function adjustWithAccidental(value, accidental) {
  switch(accidental) {
    case '#':
      return value + 1;
    case 'b':
      return value - 1;
    case 'bb':
      return value - 2;
    case '##':
      return value + 2;
    default:
      return value;
  }
}

function isSuitableForGuitarString(note, stringNumber) {
  if (stringNumber <= 1) {
    return note.role === 'root' || (note.role === 'fifth');
  }
  return true;
}

function toMidiNote(note) {
  var value = 12 + (note.octave * 12) + NOTES[note.note];
  return adjustWithAccidental(value, note.accidental);
}

function octaveChanged(a, b) {
  return NOTES[b] - NOTES[a] < 0;
}


class ChordBuilder {
  constructor() {
  }
  buildChord(model) {
    this.model = model;
    let notes = [];
    if (this.model.root) {
      notes.push(getNote(this.model, 0, 'root'));
      var third = 4;
      if (this.model.quality === 'm' || this.model.quality === 'dim') {
        third = 3;
      } else if (this.model.quality === 'sus') {
        third = null;
        let susInt = this.model.susInterval || this.model.interval;
        if (susInt === 2) {
          third = 2;
        } else if (susInt === 4) {
          third = 5;
        }
      }
      if (third && this.model.quality !== 'power') {
        notes.push(getNote(this.model, third, 'third'));
      }
      var fifth = 7;
      if (this.model.quality === 'dim') {
        fifth = 6;
      } else if (this.model.quality === 'aug') {
        fifth = 8;
      }
      if (fifth) {
        var fifthModified = _.find(this.model.extra, function (item) {
          return item.interval === 5;
        });
        if (fifthModified) {
          fifth = adjustWithAccidental(fifth, fifthModified.accidental);
        }
        notes.push(getNote(this.model, fifth, 'fifth'));
      }
      var interval = this.model.interval;
      if (interval) {
        var realInterval;
        if (interval === 7) {
          realInterval = getSeventh(this.model);
          if (this.model.quality === 'dim') {
            realInterval--;
          }
        } else if (interval === 6) {
          realInterval = 9;
        } else if (interval === 9) {
          // add also 7 to 9 chord
          realInterval = 14;
          notes.push(getNote(this.model, getSeventh(this.model), 'seventh'));
        } else if (interval === 11) {
          // add also 7 & 9 to 11 chord
          realInterval = 17;
          notes.push(getNote(this.model, getSeventh(this.model), 'seventh'));
          notes.push(getNote(this.model, 14, 'ninth'));
        } else if (interval === 13) {
          // add also 7 & 9 & 11 to 13 chord
          realInterval = 21;
          notes.push(getNote(this.model, getSeventh(this.model), 'seventh'));
          notes.push(getNote(this.model, 14, 'ninth'));
          notes.push(getNote(this.model, 17, 'eleventh'));
        }
        if (realInterval) {
          notes.push(getNote(this.model, realInterval, 'interval'));
        }
      }
      _.each(this.model.extra, function (item) {
        if ((item.action === 'add' || item.action === 'iadd') && item.interval !== 5) {
          let extraNote = getExtraNote(item, model);
          if (item.action === 'add' && item.interval === 4) {
            let hasThird = _.findIndex(notes, {role: 'third'});
            let pos = hasThird ? hasThird + 1 : 1;
            notes.splice(pos, 0, extraNote);
          } else if (item.action === 'add' && item.interval === 9) {
            notes.splice(1, 0, extraNote);
          } else {
            notes.push(extraNote);
          }
        }
      });
    }
    this.model.notes = notes;
    if (notes.length > 0) {
      this.setMidiNotes();
    }
    this.buildGuitarChord();
  }
  setMidiNotes() {
    let octave = 3;
    let notes = this.model.notes;
    let lastNote = notes[0].note;
    let octaveAdjusted = false;
    for (let i = 0; i < notes.length; ++i) {
      let acc = notes[i].accidental ? notes[i].accidental : '';
      if (i === 0 && notes[i].note !== 'A' && notes[i].note !== 'B') {
        octave = 4;
      }
      if (octaveChanged(lastNote, notes[i].note)) {
        octave++;
      }
      notes[i].octave = octave;
      notes[i].vexNote = notes[i].note + acc + "/" + octave;
      notes[i].midiNote = toMidiNote(notes[i]);
      lastNote = notes[i].note;
    }
    if (this.model.bass) {
      octave = (this.model.bass === 'A' || this.model.bass === 'B') ? 2 : 3;
      this.model.bassNote = {
        note: this.model.bass,
        accidental: this.model.bassModifier,
        octave: octave,
        vexNote: this.model.bass + (this.model.bassModifier ? this.model.bassModifier : '') + "/" + octave
      };
      this.model.bassNote.midiNote = toMidiNote(this.model.bassNote);
    }
  }
  buildGuitarChord() {
    const freeStrings = ['E', 'A', 'D', 'G', 'B', 'E'];
    let notes = this.model.notes;

    function emptyTab() {
      return {tab: 'x', note: null};
    }

    let tab = _.map(freeStrings, emptyTab);
    // Set possible free strings first
    for (let i = 0; i < notes.length; ++i) {
      let note = notes[i];
      if (!note.accidental) {
        for (let j = 0; j < freeStrings.length; ++j) {
          if (!isSuitableForGuitarString(note, j)) {
            continue;
          }
          if (freeStrings[j] === note.note) {
            tab[j] = {
              tab: 0,
              note: note,
              index: j
            };
          }
        }
      }
    }

    function assignString(j, chord, onlyMainNotes) {
      let freeNote = freeStrings[j];
      //console.log("freeNote", freeNote);
      let smallestDistance = _(chord).map(function (note, index) {
        return {
          distance: getDistance(freeNote, note) +
            (isSuitableForGuitarString(note, j) ? 0 : 12) +
            ((onlyMainNotes && (note.role !== 'root' && note.role !== 'fifth')) ? 12 : 0),
          note: note
        };
      }).sortBy(function (item) {
        //console.log(item.note.note, item.distance);
        return item.distance;
      }).first();
      //console.log(smallestDistance);
      tab[j] = {
        tab: smallestDistance.distance,
        note: smallestDistance.note,
        index: j
      };
    }

    for (let j = 0; j < tab.length; ++j) {
      if (tab[j].tab === 'x') {
        assignString(j, notes);
      }
    }

    // try to make root note the lowest string
    if (tab[0].note.role !== 'root') {
      tab[0] = emptyTab();
      if (tab[1].note.role !== 'root') {
        tab[1] = emptyTab();
      }
    }

    // try to remove double thirds
    let thirds = _(tab).filter(function(item) {
      return item.note && item.note.role === 'third';
    }).value();
    if (thirds.length > 1) {
      // leave the highest
      thirds.pop();
      _.each(thirds, function (item) {
        tab[item.index] = emptyTab();
        assignString(item.index, notes, true);
      });
    }

    this.model.guitar = _.map(tab, 'tab').join('');
  }
}

export default ChordBuilder;
