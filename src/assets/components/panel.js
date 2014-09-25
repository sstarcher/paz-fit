angular.module('app').config(function(ComponentFactoryProvider){
	var ComponentFactory = ComponentFactoryProvider.$get();
	ComponentFactory.build('panel', {
		replace: true,
		transclude: true,
		controller: function($scope) {
			$scope.c = {};
			$scope.c.hideBody = false;
		},
		scope: {'panelTitle':'@'}
	});
});
