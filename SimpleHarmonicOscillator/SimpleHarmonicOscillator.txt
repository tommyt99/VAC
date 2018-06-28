#include <iostream>
#include <cmath>
#include <array>
#include <vector>
using namespace std;

int main() {
	//This is C++ code for simple harmonic oscillator

	const int N = 100; // iterations
	const double h = 0.1; 
	const double w = 2;
	const double b = 1;
	double xs_arr[N];
	double vs_arr[N];
	double xnp1_arr[N];
	double vnp1_arr[N];

	for (int i = 0; i < N; ++i) {
	int xn = 0;
	int vn = 1; 
	 
	double xs = xn + h * vn; 
	double vs = vn + h * (-w * w*xn - b * vn);
	double xnp1 = xn + (h / 2) * (vn + vs);
	double vnp1 = vn + (h / 2)*(-w * w - b * vn - w * w*xs - b * vs);
	xs_arr[i] = xs;
	vs_arr[i] = vs;
	xnp1_arr[i] = xnp1;
	vnp1_arr[i] = vnp1; 
	}
	return 0;
}