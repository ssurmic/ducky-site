"""Build phrase captions from measured word boundaries, never character ratios."""

def normalized(text):
    return ''.join(c.casefold() for c in text if c.isalnum())

def align_chunks(chunks, words, audio_seconds):
    """Require every caption character and every provider word to match in order.

    Acronyms may arrive as separate letters (R S I), but numbers stay attached to
    their units in authored text. Caller owns phrase and line breaks.
    """
    previous=0
    for word in words:
        first=word['offset']/1e7;last=(word['offset']+word['duration'])/1e7
        if not previous<=first<last<=audio_seconds:raise ValueError('Nonmonotonic or out-of-bounds word')
        previous=last
    result=[];index=0
    for chunk in chunks:
        target=normalized(chunk);spoken='';first=index
        if not target:raise ValueError('Empty caption')
        while len(spoken)<len(target) and index<len(words):
            spoken+=normalized(words[index]['text']);index+=1
        if spoken!=target:raise ValueError('Caption does not match source words: '+chunk)
        start=words[first]['offset']/1e7
        end=(words[index-1]['offset']+words[index-1]['duration'])/1e7
        if not 0<=start<end<=audio_seconds:raise ValueError('Word outside audio')
        result.append({'start':max(0,start-.04),'end':end,'text':chunk,
                       'first_word':first,'last_word':index-1,'word_start':start,'word_end':end})
    if index!=len(words):raise ValueError('Uncaptioned words remain')
    for i,cue in enumerate(result):
        limit=result[i+1]['start']-.02 if i+1<len(result) else audio_seconds
        cue['end']=min(limit,cue['end']+.8 if i+1<len(result) else audio_seconds)
        if cue['end']<cue['word_end'] or cue['end']<=cue['start']:raise ValueError('Invalid or overlapping word times')
        cue['start']=round(cue['start'],4);cue['end']=round(cue['end'],4)
    return result
