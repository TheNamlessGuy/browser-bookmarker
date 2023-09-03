const AndThen = {
  'set-url': function(data) {
    const andthen = data.andthen;
    const url = data.url;
    const entry = data.entry;

    const regex = new RegExp(entry.regexStr);
    const matches = url.toString().match(regex);

    let retval = `${url.protocol}//${andthen.value}`;
    for (let i = 1; i < matches.length; ++i) {
      retval = retval.replaceAll(`{{${i}}}`, matches[i]);
    }

    return new URL(retval);
  }
}