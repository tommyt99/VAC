#include <iostream>
#include <string>
#include <cmath>
#include <array>
#include <iomanip>
#include <vector>
#include <list>
#include "stdlib.h"


using std::setw;
using namespace std;

int main() {

	double xvalue = 1;
	double velocityvalue = 0;
	double time = 0;
	double dt = 0.01;
	double k = 1;
	double xstar = xvalue + velocityvalue * dt;
	double vstar = velocityvalue - pow(k, 2) * xvalue * dt;
	double xnext = xvalue + .5 * (velocityvalue + vstar) * dt;
	double vnext = velocityvalue + .5 *(-pow(k, 2) * xvalue - pow(k, 2) * xstar) * dt;

	for (int i = 0; i < 3.14 * 100; i++) {
		xstar = xvalue + velocityvalue * dt;
		vstar = velocityvalue - pow(k, 2) * xvalue * dt;
		xnext = xvalue + .5 * (velocityvalue + vstar) * dt;
		vnext = velocityvalue + .5 *(-pow(k, 2) * xvalue - pow(k, 2) * xstar) * dt;

		time = time + dt;
		
		cout << "Time : " << time << setw(10) << " Position: " <<  xnext << setw(10) << " Velocity: " << vnext << endl;
		xvalue = xnext;
		velocityvalue = vnext;
	}
	cout << endl;
	cout << "The values for Position at each time should look similar to cos(t)" << endl;
	cout << "The values for Velocity at each time should look similar to -sin(t)" << endl;
	cout << endl;

	system("PAUSE");
	return 0;
}


