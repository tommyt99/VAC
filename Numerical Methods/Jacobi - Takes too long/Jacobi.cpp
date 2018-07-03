// Jacobi
#include <iostream>
#include <array>
#include <cmath>
using namespace std;


int main() {
	const int n = 2;
	double error = 1;
	double a[n][n]; // Matrix holds all of the coef of equations 
	double x[n]; // This is my guess matrix [x,y,z] 
	double current;
	double temp[n];


	cout << "Enter Matrix a:" << endl;
	for (int i = 0; i < n; i++)
		for (int j = 0; j < n+1; j++)
		{
			cout << "a[" << i << "," << j << "] = ";
			cin >> a[i][j];
		}

	cout << "Enter Matrix x, this holds the initial guesses for [x,y,z]: " << endl;
	for (int i = 0; i < n; i++) {
		cout << "x[0," << i << "] = ";
		cin >> x[i];
	}
	int count = 0; 
	while (error > pow(10, -6)) {
		count += 1; 
		for (int i = 0; i < n; i++) {
			current = 0;
			for (int j = 0; j < n; j++)
			{
				if (i == j) {
					continue;
				}

				current -= a[i][j] * x[j];

			}
			current += a[i][n];
			current /= a[i][i];
			temp[i] = current;

		}
		for (int i = 0; i < n; i++) {
			error += abs(temp[i] - x[i]);
		}
		error = error / 3;

		for (int i = 0; i < n; i++) {
			x[i] = temp[i];
		}
	}

	cout << "x = " << x[0] << endl; 
	cout << "y = " << x[1] << endl;

	int ol;
	cin >> ol; 

	return 0;
}
