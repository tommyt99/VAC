#include<iostream>
#include<math.h>
using namespace std;

const int n = 3;

void Jacobi(double a[][n], double b[]) {
	cout << "Jacobi Method" << endl << "-------------" << endl;
	double x[n] = { 0,0,0 };
	double error = 0.1;
	double u[n];
	double temp[n];
	int iterations = 0;
	while (error > pow(10, -6)) {
		iterations++;
		for (int i = 0; i < n; i++) {
			u[i] = b[i] / a[i][i];
			for (int j = 0; j < n; j++) {
				if (j != i) { u[i] = u[i] - (x[j] * a[i][j]) / a[i][i]; }
			}
		}
		for (int k = 0; k < n; k++) {
			temp[k] = x[k];
			x[k] = u[k];
			//cout << x[k] << endl;		Testing
		}
		double sum = 0;
		for (int l = 0; l < n - 1; l++) {
			sum += abs(temp[l] - x[l]);
		}
		error = sum / n;
		//cout << "error= " << error << endl;	Testing
	}
	for (int k = 0; k < n; k++) {
		cout << "x" << k + 1 << " = " << x[k] << endl;
	}
	cout << "Number of iterations: " << iterations << endl;
}

void GuessSeidel(double a[][n], double b[]) {
	cout << "GuessSeidel Method" << endl << "------------------" << endl;
	double x[n] = { 0,0,0 };
	double error = 0.1;
	double u[n];
	double temp[n];
	int iterations = 0;
	while (error > pow(10, -6)) {
		iterations++;
		for (int i = 0; i < n; i++) {
			u[i] = b[i] / a[i][i];
			for (int j = 0; j < n; j++) {
				if (j != i) { u[i] = u[i] - (x[j] * a[i][j]) / a[i][i]; }
			}
			temp[i] = x[i];
			x[i] = u[i];
		}
		double sum = 0;
		for (int l = 0; l < n - 1; l++) {
			sum += abs(temp[l] - x[l]);
		}
		error = sum / n;
		//cout << "error= " << error << endl;	Testing
	}
	for (int k = 0; k < n; k++) {
		cout << "x" << k + 1 << " = " << x[k] << endl;
	}
	cout << "Number of iterations: " << iterations << endl;
}


int main() {
	double a[n][n] = { {3,-0.1,-0.2},{0.1,7,-0.3},{0.3,-0.2,10} };
	double b[n] = { 7.85,-19.3,71.4 };

	Jacobi(a, b);
	cout << endl << endl;
	GuessSeidel(a, b);

	system("PAUSE");
}