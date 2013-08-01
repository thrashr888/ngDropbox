'use strict';

angular.module('dropbox', [])
  .factory('Dropbox', function ($q, $http, $window, DropboxClientId) {

    /**
     * Credentials
     */

    var oauth = {};


    /**
     * Dropbox API Servers
     */

    var authServer = 'https://www.dropbox.com'
      , apiServer  = 'https://api.dropbox.com'
      , fileServer = 'https://api-content.dropbox.com';


    /**
     * API Method URLs
     */

    var urls = {
      // Authentication.
      authorize:           authServer + '/1/oauth2/authorize',
      token:               apiServer  + '/1/oauth2/token',
      signOut:             apiServer  + '/1/unlink_access_token',

      // Accounts.
      accountInfo:         apiServer  + '/1/account/info',

      // Files and metadata.
      getFile:             fileServer + '/1/files/auto/',
      postFile:            fileServer + '/1/files/auto/',
      putFile:             fileServer + '/1/files_put/auto/',
      metadata:            apiServer  + '/1/metadata/auto/',
      delta:               apiServer  + '/1/delta',
      revisions:           apiServer  + '/1/revisions/auto/',
      restore:             apiServer  + '/1/restore/auto',
      search:              apiServer  + '/1/search/auto/',
      shares:              apiServer  + '/1/shares/auto',
      media:               apiServer  + '/1/media/auto',
      copyRef:             apiServer  + '/1/copy_ref/auto',
      thumbnails:          fileServer + '/1/thumbnails/auto',
      chunkedUpload:       fileServer + '/1/chunked_upload',
      commitChunkedUpload: fileServer + '/1/commit_chunked_upload/auto',

      // File operations.
      fileopsCopy:         apiServer  + '/1/fileops/copy',
      fileopsCreateFolder: apiServer  + '/1/fileops/create_folder',
      fileopsDelete:       apiServer  + '/1/fileops/delete',
      fileopsMove:         apiServer  + '/1/fileops/move'
    };


    /**
     * OAuth 2.0 Signatures
     */

    function oauthHeader(options) {
      if (!options.headers) { options.headers = {}; }
      options.headers['Authorization'] = 'Bearer ' + oauth.access_token;      
    }

    function oauthParams(options) {
      if (!options.params) { options.params = {}; }
      options.params.access_token = oauth.access_token;      
    }


    /**
     * HTTP GET Helper
     */

    function GET(url, params) {
      var deferred = $q.defer()
        , options  = { params: params };

      oauthHeader(options);
      // oauthParams(options);

      function success(response) {
        console.log(url, options, response.data)
        deferred.resolve(response.data); 
      }

      function failure(fault) {
        console.log(url, options, fault)
        deferred.reject(fault); 
      }

      $http.get(url, options).then(success, failure);
      return deferred.promise;
    }  


    /**
     * Configure the authorize popup window
     * Adapted from dropbox-js
     */
    
    function popupSize(popupWidth, popupHeight) {
      var x0, y0, width, height, popupLeft, popupTop;

      // Metrics for the current browser window.
      x0 = $window.screenX || $window.screenLeft
      y0 = $window.screenY || $window.screenTop
      width = $window.outerWidth || $document.documentElement.clientWidth
      height = $window.outerHeight || $document.documentElement.clientHeight

      // Computed popup window metrics.
      popupLeft = Math.round(x0) + (width - popupWidth) / 2
      popupTop = Math.round(y0) + (height - popupHeight) / 2.5
      if (popupLeft < x0) { popupLeft = x0 }
      if (popupTop < y0) { popupTop = y0 }

      return 'width=' + popupWidth + ',height=' + popupHeight + ',' +
             'left=' + popupLeft + ',top=' + popupTop + ',' +
             'dialog=yes,dependent=yes,scrollbars=yes,location=yes';
    }


    /**
     * Parse credentials from Dropbox authorize callback
     * Adapted from dropbox-js
     */

    function queryParamsFromUrl(url) {
      var match = /^[^?#]+(\?([^\#]*))?(\#(.*))?$/.exec(url);
      if (!match) { return {}; }

      var query = match[2] || ''
        , fragment = match[4] || ''
        , fragmentOffset = fragment.indexOf('?')
        , params = {}
        ;

      if (fragmentOffset !== -1) {
        fragment = fragment.substring(fragmentOffset + 1);
      }

      var kvp = query.split('&').concat(fragment.split('&'));
      kvp.forEach(function (kv) {
        var offset = kv.indexOf('=');
        if (offset === -1) { return; }
        params[decodeURIComponent(kv.substring(0, offset))] =
               decodeURIComponent(kv.substring(offset + 1));
      });

      return params;
    }


    /**
     * Dropbox Service
     */

    return {
      
      urls: urls,                       // exposed for testing


      authorize: function () {
        var self = this
          , redirectUri = 'https://gapi-8340.onmodulus.net/dropbox.html'
          , authUrl = 'https://www.dropbox.com/1/oauth2/authorize'
                    + '?client_id=' + DropboxClientId
                 // + '&state=' + 
                    + '&response_type=token'
                    + '&redirect_uri=' + redirectUri

        // listen for message here
        function listener(event) {
          oauth = queryParamsFromUrl(event.data);
          self.oauth = oauth;
          console.log('Dropbox', self);
        }

        $window.addEventListener('message', listener, false);
        $window.open(authUrl,'_dropboxOauthSigninWindow', popupSize(700, 500));
      },


      credentials: function () {
        return oauth;
      },


      // authenticate


      isAuthenticated: function () {
        return (oauth.access_token) ? true : false
      },

      // signOut

      // signOff


      accountInfo: function () {
        return GET(urls.accountInfo);
      },


      readFile: function (path, params) {
        return GET(urls.getFile + path, params);
      },


      stat: function (path, params) {
        return GET(urls.metadata + path, params);
      },


      readdir: function (path, params) {
        var deferred = $q.defer();

        function success(stat) { 
          var entries = stat.contents.map(function (entry) {
            return entry.path;
          });
          
          console.log('readdir of ' + path, entries);
          deferred.resolve(); 
        }

        function failure(fault) { deferred.reject(fault); }

        this.stat(path, params).then(success, failure);
        return deferred.promise;
      },


      metadata: function (path, params) {
        return this.stat(path, params);
      },


      // makeUrl


      history: function (path, params) {
        return GET(urls.revisions + path, params);
      },


      revisions: function (path, params) {
        return this.history(path, params);
      },


      thumbnailUrl: function (path, params) {
        return urls.thumbnails 
             + path 
             + '?format=jpeg&size=m&access_token='
             + oauth.access_token;
      },


      // readThumbnail


      // revertFile


      // restore


      findByName: function (path, pattern, params) {
        var params = params || {};
        params.query = pattern;

        return GET(urls.search + path, params);
      },


      search: function (path, pattern, params) {
        return this.findByName(path, pattern, params);
      },


      // makeCopyReference


      // copyRef


      // pullChanges


      // delta


      // mkdir


      // remove


      // unlink


      // delete


      // copy


      // move


      // reset


      setCredentials: function (credentials) {
        oauth = credentials;
      },


      // appHash


    };
  });