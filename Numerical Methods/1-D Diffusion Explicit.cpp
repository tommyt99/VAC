//1-D Diffusion - Explicit
//Helmholtz Equation

//Solved using Thomas Algo


#include <iostream>
#include <vector>
#include <array>
#include <cmath>
using namespace std;

int main() {
	int N = 3;
	double D = 1;
	double dx = 0.05;
	double dt = 0.01; 
	double a[] = { D*dt/(dx*dx), D*dt / (dx*dx), D*dt / (dx*dx) };
	double b[] = { 0, -2 * dt*D / (dx*dx),-2 * dt*D / (dx*dx) };
	double c[] = { D*dt/(dx*dx), D*dt / (dx*dx), 0 };
	double x[2];
	double f[] = { -1, 7, 7 };



	for (int j = 2; j <= N; j++) {
		a[j] = a[j] - (b[j] / a[j - 1])*(c[j - 1]);
		f[j] = f[j] - (b[j] / a[j - 1]) * (f[j - 1]);
	}

	x[N] = f[N] / a[N];

	for (int k = 1; k <= N - 1; k++) {
		x[N - k] = (f[N - k] - (c[N - k] * x[N - k + 1])) / a[N - k];
	}

	for (int i = 0; i < 3; i++) {
		cout << x[i] << endl;
	}

	int o;
	cin >> o;
	return 0;
}