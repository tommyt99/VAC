#include <iostream>
#include <cmath>
#include <array>
#include <vector>

using namespace std;

int main() {
	int u[10]; // array u[] stores integral values for some function 
	float h = 0.5; 
	float e = pow(10, -6);
	double a = 1.0; 
	for (int n = 0; n < 10; n++) {
		float delta = abs(u[n] * h / 2 + u[n] * h / 2 - u[n] * h);
		float deltadesired = e * abs(u[n] + h * ((u[n+1] - u[n])/h));
		float phi = deltadesired / delta;

		if( phi > pow(10, 3)) {
			a = 0.2;
			h = pow(h * phi, a); 
		}

		if (phi < pow(10, -5)) {
			a = 0.25;
			h = pow(h * phi, a);
		}

	}


	return 0;
}