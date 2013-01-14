var ODSUI = {
  setupDialogs: function() {
    if(s_odsSession) {
      setupProfileDialogs();
    }
    else {
      setupLoginDialog();
    }
  }
};
