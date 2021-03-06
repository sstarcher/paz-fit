angular.module('app').config(function(ScreenFactoryProvider) {
	var ScreenFactory = ScreenFactoryProvider.$get();
	ScreenFactory.build('screen-profile-maxes-edit', function($scope, $injector, $routeParams, $location, Database, DatastoreSync, $window) {
		var MaxesDao = $injector.get('MaxesDao');

		$scope.key = $routeParams.key; 
		$scope.r = $routeParams;

		$scope.getMaxes  = function() {
			var params = {"feq_key": $scope.key};
			MaxesDao.find(params).then(function(records) {
				$scope.$loading = false;
				var Maxes = records[0];

				$scope.uriEncodedMaxes = $.param({
						p: Maxes.press,
						d: Maxes.deadlift,
						b: Maxes.bench,
						s: Maxes.squat
				});


				if(angular.isDefined(Maxes)) {
					$scope.record = Maxes;
				} else {
					$scope.record = {
						date: $scope.date
					};
				}
			});
		};

		$scope.saveChanges = function() {
			if(angular.isUndefined($scope.record.key)) {
				$scope.record.date = $scope.r.date;
			}

			var promise = MaxesDao.save($scope.record);
			$scope.saveStatus = null;

			$scope.saveStatus = 'saving';

			promise.then(function() {
				$scope.saveStatus = 'saved';
			}, function() {
				$scope.saveStatus = 'error';
			});
		};

		$scope.remove = function() {
			var remove = $window.confirm('Are you sure you want to remove this Max?');
			if(!remove) return;

			var promise = MaxesDao.remove($scope.record);

			promise.then(function() {
				$location.path('/');
			}, function() {
				$window.alert('error deleting');
			});

		};

		$scope.$loading = true;
		if(angular.isDefined($scope.key)) {
			$scope.getMaxes();
		} else {
			$scope.record = {};
			$scope.record.date = $routeParams.date;
			var params = {"fle_date": $routeParams.date, "ordering": "-date"};
			MaxesDao.find(params).then(function(records) {
			$scope.$loading = false;
				var Maxes = records[0];

				var record = angular.copy(Maxes);

				delete record.key;
				record.date = $routeParams.date;
				record.press += 5;
				record.deadlift += 10;
				record.bench += 5;
				record.squat += 10;
				$scope.record = record;
			});
		}
	});
});
