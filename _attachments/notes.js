var Notes = (function () {  

  var mainDb     = document.location.pathname.split("/")[1],
      ctrlDb     = mainDb + "-ctrl",
      storageKey = "syncDetails",
      details    = jsonStorage(storageKey),
      router     = new Router(),
      $db        = $.couch.db(mainDb),
      $ctrl      = $.couch.db(ctrlDb),
      currentDoc = null;
  
  router.get(/^(!)?$/, function () {
    $db.view('couchnotes/notes', {
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

  router.get('!/sync/', function () {
    render("#sync_tpl", details);
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

  function _changesListener(dbName, since) {
    $.ajax({
      method   : "GET",
      url      : "/" + dbName + "/_changes",
      data     : {since: since, feed:"longpoll", include_docs: true},
      contentType : "application/json", 
      dataType : "json",
      "success": function (data) {
        for( var i = 0; i < data.results.length; i++) {
          var doc = data.results[i].doc;
          if (doc.result && doc.status && doc.status === "complete") { 
            $("#feedback").text("Replication Complete");            
          }
        }
        _changesListener(dbName, data.last_seq);
      }
    });
  };
  
  function changesListener(dbName) {
    $ctrl.info({
      "success": function (data) {
        _changesListener(dbName, data.update_seq);
      },
      error : function () {
        $ctrl = false;
      }
    });
  };

  changesListener(ctrlDb);
  
  function saveDetails() {
    
    details = {
      "username" : $("#username").val(),
      "password" : $("#password").val(),
      "server"   : $("#server").val(),
      "database" : $("#database").val()
    };
    jsonStorage(storageKey, details);    
  };

  
  function showNote(id, edit) {
    $db.openDoc(id, {
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
      return callback();
    }
    
    var doc = {
      _id : new Date().getTime() + "",
      title : title,
      type : 'note',
      notes : notes,
      created : new Date().getTime()
    };

    if (currentDoc) {
      doc._id = currentDoc._id;
      doc._rev = currentDoc._rev;
    }
      
    $db.saveDoc(doc, {
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

  function jsonStorage(key, val) {
    if (val) {
      localStorage[key] = JSON.stringify(val);
      return true;
    } else { 
      return localStorage && localStorage[key] &&
        JSON.parse(localStorage[key]) || false;
    }
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
          if (doc) { 
              document.location.href = '#!/' + doc._id +'/';
          }
      });
    });     
  };

  function createUrlFromDetails() {
    if (details.username === "") {
      return "http://" + details.server + "/" + details.database;
    } else { 
      return "http://" + details.username + ":" + details.password + "@"
        + details.server + "/" + details.database;
    }
  };

  function doReplication(obj) {
    $.ajax({
      "url": "/" + ctrlDb,
      "type": 'POST',
      "data": JSON.stringify(obj),
      contentType : "application/json",
      dataType : "json",
      "success": function () {
        $("#feedback").text("Starting Replication");
      }
    });
  };
  
  $("#push").live("click", function (obj) {
    saveDetails();
    doReplication({    
      "target" : createUrlFromDetails(),
      "source" : mainDb
    });
  });

  $("#pull").live("click", function () {
    saveDetails();
    doReplication({    
      "target" : mainDb,
      "source" : createUrlFromDetails()
    });
  });
  
  bindDomEvents();
  router.init();
  
})();