#include<iostream>
#include<cmath>
#include<fstream>
using namespace std;

ofstream Vvalues("Vvalues.txt");

const int it = 30;
double L = 2 * 3.141596;
double dt = 0.01;
double dx = L/(double)(it);
const double c = 1;

double f(double x, double t) {
	double A = 1;
	//return A * sin(3.14159265*x*N / L);
	return 1 / 2 * cos(x + t) + 1 / 2 * cos(x - t);
}

double g(double x) {
	return sin(x);
}

void Initial(double vb[], double v[], double vf[]) {
	double x = 0;
	for (int i = 0; i < it; i++) {
		v[i] = f(x, 0);
		vb[i] = v[i]-2*dt*g(x);
		vf[i] = 0;
		x += dx;
	}
	x = 0;
}

int main() {
	double vb[it];
	double v[it];
	double vf[it];
	double t = 0;

	Initial(vb, v, vf);
	while (t < 20) {
		t += dt;
		for (int i = 1; i < it - 1; i++) {
			vf[i] = ((c*c*dt*dt) / (dx*dx))*(v[i - 1] - 2 * v[i] + v[i + 1]) + 2 * v[i] - vb[i];
		}
		for (int i = 0; i < it; i++) {
			vb[i] = v[i];
			v[i] = vf[i];
			cout << v[i] << " ";
			Vvalues << v[i] << " ";
		}
		cout << endl;
		Vvalues << endl;
	}

	system("PAUSE");
	return 0;
}