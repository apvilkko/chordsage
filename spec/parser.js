import ChordParser from '../src/parser';
import ChordBuilder from '../src/chordbuilder';
import _ from 'lodash';

const config = {
  freeStrings: ['E', 'A', 'D', 'G', 'B', 'E'],
  fretSpread: 4,
  fretPosition: 1,
  chordInput: 'Dmaj7/F#'
};

function createParser(conf) {
  return new ChordParser(conf || config);
}

function createBuilder(conf) {
  return new ChordBuilder(conf || config);
}

describe('ChordParser', function () {
  it('should parse chord input', function () {
    let parser = createParser();
    parser.parse('CM7');
    expect(parser.toString()).toEqual('Cmaj7');
    parser.parse('d7sus4');
    expect(parser.toString()).toEqual('D7sus4');
    parser.parse('dsus');
    expect(parser.toString()).toEqual('Dsus4');
    parser.parse('f7sus');
    expect(parser.toString()).toEqual('F7sus4');
    parser.parse('dsus2');
    expect(parser.toString()).toEqual('Dsus2');
    parser.parse('H7add#11+9');
    expect(parser.toString()).toEqual('B7♯9add♯11');
  });
});

function verify(expected, notes) {
  return expect(_.map(notes, 'vexNote')).toEqual(expected);
}

describe('ChordBuilder', function () {
  it('should set notes for Vex', function () {
    let parser = createParser();
    let builder = createBuilder();
    parser.parse('bm7');
    builder.buildChord(parser.model);
    let expected = ['B/3', 'D/4', 'F#/4', 'A/4'];
    let vexNotes = _.map(parser.model.notes, 'vexNote');
    expect(vexNotes).toEqual(expected);
  });

  it('should set midi notes', function () {
    let parser = createParser();
    let builder = createBuilder();
    parser.parse('Ebmaj7');
    builder.buildChord(parser.model);
    let expected = [63, 67, 70, 74];
    let notes = _.map(parser.model.notes, 'midiNote');
    expect(notes).toEqual(expected);
  });

  it('should handle guitar chords', function () {
    let parser = createParser();
    let builder = createBuilder();

    parser.parse('E');
    builder.buildChord(parser.model);
    expect(parser.model.guitar).toEqual('022100');

    parser.parse('dsus4');
    builder.buildChord(parser.model);
    expect(parser.model.guitar).toEqual('xx0233');

    parser.parse('A');
    builder.buildChord(parser.model);
    expect(parser.model.guitar).toEqual('x02220');

    parser.parse('Asus2');
    builder.buildChord(parser.model);
    expect(parser.model.guitar).toEqual('x02200');

    parser.parse('Asus4');
    builder.buildChord(parser.model);
    expect(parser.model.guitar).toEqual('x02230');

    parser.parse('g#maj7');
    builder.buildChord(parser.model);
    expect(parser.model.guitar).toEqual('4x1113');
  });

  it('should handle a bunch of chords', function () {
    let parser = createParser();
    let builder = createBuilder();

    parser.parse('Eadd2');
    builder.buildChord(parser.model);
    verify(['E/4', 'F#/4', 'G#/4', 'B/4'], parser.model.notes);

    parser.parse('E');
    builder.buildChord(parser.model);
    verify(['E/4', 'G#/4', 'B/4'], parser.model.notes);

    parser.parse('dsus4');
    builder.buildChord(parser.model);
    verify(['D/4', 'G/4', 'A/4'], parser.model.notes);

    parser.parse('A');
    builder.buildChord(parser.model);
    verify(['A/3', 'C#/4', 'E/4'], parser.model.notes);

    parser.parse('Asus2');
    builder.buildChord(parser.model);
    verify(['A/3', 'B/3', 'E/4'], parser.model.notes);

    parser.parse('Asus4');
    builder.buildChord(parser.model);
    verify(['A/3', 'D/4', 'E/4'], parser.model.notes);

    parser.parse('gbm7');
    builder.buildChord(parser.model);
    verify(['Gb/4', 'Bbb/4', 'Db/5', 'Fb/5'], parser.model.notes);

    parser.parse('Bsus4');
    builder.buildChord(parser.model);
    verify(['B/3', 'E/4', 'F#/4'], parser.model.notes);

    parser.parse('g#sus2');
    builder.buildChord(parser.model);
    verify(['G#/4', 'A#/4', 'D#/5'], parser.model.notes);

    parser.parse('C7sus');
    builder.buildChord(parser.model);
    verify(['C/4', 'F/4', 'G/4', 'Bb/4'], parser.model.notes);

    parser.parse('C9sus4');
    builder.buildChord(parser.model);
    verify(['C/4', 'F/4', 'G/4', 'Bb/4', 'D/5'], parser.model.notes);

    parser.parse('C7b9#11');
    builder.buildChord(parser.model);
    verify(['C/4', 'E/4', 'G/4', 'Bb/4', 'Db/5', 'F#/5'], parser.model.notes);

    parser.parse('Bb13');
    builder.buildChord(parser.model);
    verify(['Bb/3', 'D/4', 'F/4', 'Ab/4', 'C/5', 'Eb/5', 'G/5'], parser.model.notes);

    parser.parse('Eadd4/F#');
    builder.buildChord(parser.model);
    expect(parser.model.bassNote.vexNote).toEqual('F#/3');
    verify(['E/4', 'G#/4', 'A/4', 'B/4'], parser.model.notes);

    parser.parse('Gadd9');
    builder.buildChord(parser.model);
    verify(['G/4', 'A/4', 'B/4', 'D/5'], parser.model.notes);
  });
});
