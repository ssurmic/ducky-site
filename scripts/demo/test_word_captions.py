import unittest
from word_captions import align_chunks

def word(text,start,end):
 return {'text':text,'offset':round(start*1e7),'duration':round((end-start)*1e7)}
class Captions(unittest.TestCase):
 def test_uses_word_onsets_and_not_character_ratios(self):
  cues=align_chunks(['A.','Longer phrase.'],[word('A',.1,.4),word('Longer',1.4,1.8),word('phrase',1.9,2.3)],2.6)
  self.assertAlmostEqual(cues[1]['start'],1.36)
  self.assertGreaterEqual(cues[0]['end'],.4)
  self.assertLess(cues[0]['end'],cues[1]['start'])
 def test_acronyms_and_percent_stay_readable(self):
  cues=align_chunks(['RSI below 35.','Up 17%.'],[word('R',.1,.2),word('S',.2,.3),word('I',.3,.4),word('below',.5,.7),word('35',.8,1.1),word('Up',1.2,1.4),word('17%',1.5,2)],2.2)
  self.assertEqual(cues[0]['last_word'],4);self.assertEqual(cues[1]['text'],'Up 17%.')
 def test_missing_or_wrong_words_fail_closed(self):
  for chunks in (['Up 70%.'],['Up.']):
   with self.assertRaises(ValueError):align_chunks(chunks,[word('Up',.1,.3),word('17%',.4,.8)],1)
 def test_bad_boundaries_fail_closed(self):
  for words in ([word('A',.4,.8),word('B',.2,.3)],[word('A',.1,1.1)]):
   with self.assertRaises(ValueError):align_chunks(['A B.' if len(words)>1 else 'A.'],words,1)
 def test_continuous_speech_keeps_both_words_at_phrase_boundary(self):
  cues=align_chunks(['Nokia','and Corning.'],[word('Nokia',.1,.6),word('and',.6,.8),word('Corning',.8,1.3)],1.5)
  self.assertEqual(cues[0]['end'],.6)
  self.assertEqual(cues[1]['start'],.6)
  self.assertEqual(cues[1]['end'],1.5)
if __name__=='__main__':unittest.main()
