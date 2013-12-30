angular.module('resources').config(function($provide) {

	$provide.factory('DaoFactory', function($http, $q) {
		function Dao(storeName) {
			this.storeName = storeName
			this.httpConfigDefaults = {
				url: '/rest/'+storeName,
			};
		}

		Dao.prototype._http = function(httpConfig) {
			var resultHttpConfig = {};
			angular.extend(resultHttpConfig, this.httpConfigDefaults, httpConfig);
			var httpPromise = $http(resultHttpConfig);

			return httpPromise;
		};

		Dao.prototype.get = function(key) {
		};

		Dao.prototype.find = function(params) {
			var deffered = $q.defer();
			var config = {
				method: 'GET',
				params: params
			};

			angular.extend(config, httpConfigDefaults);

		};

		Dao.prototype.fetchFromDateRange = function(beginDate, endDate) {
			var httpConfig = { 
				method: 'GET',
				params: {
					'fge_date': beginDate,
					'fle_date': endDate,
				},
			};


			var httpPromise = this._http(httpConfig);

			var deffered = $q.defer();

			var _this = this;
			httpPromise.then(function(response) {
				var records = response.data.list[_this.storeName];
				deffered.resolve(records);
			});

			return deffered.promise;
		};

		function DaoFactory(storeName, extendo) {
			var dao = new Dao(storeName);
			return dao; 
		}

		return DaoFactory;
	});

	$provide.factory('MaxesDao', function($http, $q, DaoFactory, Database) {
		var MaxesDao = DaoFactory('Maxes');
		return MaxesDao;
	});

	$provide.factory('PersonalRecordDao', function($http, $q, Database, DaoFactory) {
		var PersonalRecordDao = DaoFactory('PersonalRecord');
		return PersonalRecordDao;
	});

	$provide.factory('Database', function(SchemaManager, $rootScope) {
		var databaseInstance = new ydn.db.Storage('ajpaz531', SchemaManager.schema);

		angular.forEach(['error','updated','created','ready','fail'], function(type) {
			databaseInstance.addEventListener(type, function(event) {
				var name = 'Database'+(type.charAt(0).toUpperCase() + type.slice(1));
				$rootScope.$broadcast(name, event.name, event);
				console.debug(name, event);
			});
		});

		return databaseInstance;
	});

	$provide.factory('DatastoreSync', function($http, $rootScope, $q, Database, SchemaManager) {
		function DatastoreSync() {

			this.pull = function() {
				var deferred = $q.defer();

				this.iterateStores(function(store) {
					//TODO gather etags from metadata database
					var config = {
						method: 'GET',
						url: '/rest/'+store.name,
						//headers: {
						//	"If-None-Match": "*",
						//}
					};

					var cb = {
						success: function(response) {
							if(angular.isUndefined(response.data.list)) {
								throw "Malformed response. Expected one list element";
							}

							var elements = response.data.list[store.name];

							if(angular.isUndefined(elements)) {
								console.debug("No new elements to add");
							} else {
								Database.put(store.name, elements).then(function() { 
									$rootScope.$apply();
								});
							}
						},
						failure: function(error) {
							if(error.status == 304) {
								console.debug('Not Modified recieved for '+store.name);
							} else {
								throw "Erorr during Datastore pull" + error;
							}
						}
					};

					var promise = $http(config);
					var chainedPromise =  promise.then(cb.success, cb.failure);
					return chainedPromise;
				});

				return deferred.promise;
			};

			this.push = function() {
				var promises = [];

				this.iterateStores(function(store) {
					var deffered = $q.defer();
					promises.push(deffered.promise);

					var dbPromise = Database.values(store.name);

					var dbDeffered = $q.defer();

					dbPromise.done(function(records) {
						$rootScope.$apply(function() {
							dbDeffered.resolve(records);
						});
					});

					dbDeffered.promise.then(function(records) {
						var config = {
							method: 'POST',
							url: '/rest/'+store.name,
							data: {},
							headers: {
								"ETag": "*",
							}
						};
						var postData = {};
						config.data.list = {};
						config.data.list[store.name] = records;

						var cb = {
							success: function(response) {
								console.debug('Successfully pushed datastore', store.name);
								deffered.resolve();
							},
							failure: function(data) {
								console.error('Could not push datastore',store.name);
								throw "Datastore Sync Error "+store.name;
								deffered.resolve();
							}
						};

						var promise = $http(config);
						promise.then(cb.success, cb.failure);
					});
				});

				return $q.all(promises); 
			};

			this.iterateStores = function(callback) {

				var stores = SchemaManager.getPublicStores();
				angular.forEach(stores, callback);
			};

		}

		var instance = new DatastoreSync();
		return instance;
	});

	$provide.provider('SchemaManager', function SchemaManagerProvider() {
		function Schema() {
			this.stores = [];
		}

		this.schema = new Schema();
		this.publicStores = [];

		this.addStore = function(store) {
			store.dispatchEvents = 'canAnythingGoHere';
			this.schema.stores.push(store);
			if(!(/^_/).test(store.name)) {
				this.publicStores.push(store);
			}
		};

		this.getPublicStores = function() {
			return this.publicStores;
		};

		this.$get = function() {
			return this;
		};
	});

})
