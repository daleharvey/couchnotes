function(doc) {
  if (doc.type && doc.type === 'note') {
    emit([doc.created, doc.title], null);
  }
};