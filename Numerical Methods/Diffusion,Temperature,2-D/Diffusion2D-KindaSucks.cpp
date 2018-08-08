#include <iostream>
#include <fstream>
using namespace std;

const int n = 200;
int L = 3;
double dx = 0.1;
double dy = 0.1;
double dt = 0.004;
double d = 1;


int main() {
	double x[n][n];
	double xn[n][n];

	for (int i = 0; i < n; i++) {
		for (int j = 0; j < n; j++) {
			if (i == 0) {
				xn[i][j] = 2.5; // Left Bound
			}
			else if (i == n - 1) {
				xn[i][j] = 2.5; // Right Bound
			}
			else if (j == 0) {
				xn[i][j] = 2.5; // Top Bound
			}
			else if (j == n - 1){
				xn[i][j] = 2.5; // Bottom Bound
			}
			else {
				xn[i][j] = 0; // Center
			}
			x[i][j] = 0;
		}
	}
	
	for (int t = 0; t < 5000; t++) {
		for (int i = 1; i < n-1; i++) {
			for (int j = 1; j < n - 1; j++) {
				xn[i][j] = x[i][j] + (d * dt / pow(dx,2)) * (x[i][j - 1] - 2 * x[i][j] + x[i][j + 1]);
			}
		}
		for (int i = 0; i < n; i++) {
			for (int j = 0; j < n; j++) {
				x[i][j] = xn[i][j];
			}
		}
		for (int j = 1; j < n-1; j++) {
			for (int i = 1; i < n - 1; i++) {
				xn[i][j] = x[i][j] + (d * dt / pow(dy,2)) * (x[i - 1][j] - 2 * x[i][j] + x[i + 1][j]);
			}
		}
		for (int i = 0; i < n; i++) {
			for (int j = 0; j < n; j++) {
				x[i][j] = xn[i][j];
			}
		}
		
	}


	ofstream file;
	file.open("diff.txt");
	int k = 0;
	for (int i = 0; i < n; i++) {
		for (int j = 0; j < n; j++) {
			cout << xn[i][j] << " ";
			file << xn[i][j] << " ";
		}
		cout << endl;
		file << endl;
	}
	file.close();

	system("PAUSE");
	return 0;
}