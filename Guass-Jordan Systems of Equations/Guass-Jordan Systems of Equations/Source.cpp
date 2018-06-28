#include <iostream>
#include <array>
#include <cmath>
using namespace std;

int main() {
	const int n=2;
	double a[n][n]; 
	a[0][0] = 0.0003;
	a[0][1] = 3;
	a[1][0] = 1;
	a[1][1] = 1;
	double sum = 0; 
	double b[2] = { 2.0001, 1 };
	double x[n]; 

	for (int i = 0; i < 2; i++) {
		for (int j = 0; j < 2; j++) {
			cout << a[i][j] << " ";
		}
		cout << endl;
	}
	
	//This is when the real code starts (START AT 0!!!) 
	// Forward Elimination
	for (int k = 0; k<n-1;k++) 
		for (int i = k + 1; i < n; i++) {
			double mult = a[i][k] / a[k][k];
			for (int j = k + 1; j < n; j++){
				a[i][j] = a[i][j] - mult*a[k][j];
			}
			b[i] = b[i] - mult * b[k];
		}

	// Backward Substitution
	x[n - 1] = b[n - 1] / a[n - 1][n - 1]; // check this (if this value is zero, enter matrix again)
	for (int i = n- 1; i >= 0; i--) {
		sum = b[i];
		for (int j = i + 1; i < n; j++) {
			sum = sum - a[i][j]*x[j];
			}
		x[i] = sum / a[i][i];
		
	}

	cout << "x1: " << x[0] << endl;
	cout << "x2: " << x[1] << endl; 
	
	

	int o;
	cin >> o;

	return 0;

}