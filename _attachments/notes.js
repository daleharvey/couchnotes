var Notes = (function () {  

  var dbName     = 'couchnotes',
      router     = new Router(),
      db         = $.couch.db(dbName),
      currentDoc = null;

  router.get(/^(!)?$/, function () {
    db.view(dbName + '/notes', {
      descending : true,
      success : function (data) {
        var i, rows = [];
        for (i=0; i < data.total_rows; i++) {
          rows.push({
            id : data.rows[i].id,
            title : data.rows[i].key[1],
            date : formatDate(data.rows[i].key[0])
          });
        }
        render("#home_tpl", {notes:rows});
      }
    });
  });
  
  router.get('!/:id/edit/', function (id) {
    showNote(id, true);
  });

  router.get('!/:id/', function (id) {
    showNote(id, false);
  });

  router.post('delete', function () {
    db.removeDoc(currentDoc, {
      success: function () {
        document.location.href = "#!";
      }
    });
  });


  function showNote(id, edit) {
    db.openDoc(id, {
      error : function (data) {
        currentDoc = null;
        renderNote({title:"New Note"}, edit);
      },
      success : function (data) {
        currentDoc = data;
        data.created = formatDate(data.created);
        data.editLink = '#!/' + data._id + '/edit/';
        renderNote(data, edit);
      }
    });
  };
  
  function renderNote(data, edit) {
    render("#create_tpl", data);
    if (edit) { 
      $("#notes textarea")[0].focus();
    } else {
      stopEditing();
    }
  };

  function startEditing() {
    $("#edit").hide();
    $("#save").show();
  };

  function stopEditing() {
    $("#edit").show();
    $("#save").hide();
  };
    
  function saveNote(callback) {

    var notes = $("#notes textarea").val(),
        title = notes.split('\n')[0];

    if (notes === "" || title === "") {
      return false;
    }
    
    var doc = {
      _id : new Date().getTime() + "",
      title : title,
      type : 'note',
      notes : notes,
      created : new Date()
    };

    if (currentDoc) {
      doc._id = currentDoc._id;
      doc._rev = currentDoc._rev;
    }

      
    db.saveDoc(doc, {
      success : function (data) {
        if (!currentDoc) {
          currentDoc = doc;
        }
        currentDoc._rev = data.rev;
        if (typeof callback === "function") {
          callback(doc);
        }
      }
    });

    return title;
  };
  
  function formatDate(date) {
    return prettyDate(new Date(date));
  };
  
  function render(tpl, data) {
    data = data || {};
    $('#content').html(Mustache.to_html($(tpl).html(), data));
  };

  // I dont like these global events, they are bound to the page permanently
  // so may cause conflicts
  function bindDomEvents() {    
    $("#notes textarea").live("focus", startEditing);

    $("#back").live("click", function () {
      saveNote(function (doc) {
        document.location.href = '#!';
      });
    });
    $("#save").live("click", function () {
      saveNote(function (doc) {
        document.location.href = '#!/' + doc._id +'/';
      });
    });     
  };
  
  bindDomEvents();
  router.init();
  
})();