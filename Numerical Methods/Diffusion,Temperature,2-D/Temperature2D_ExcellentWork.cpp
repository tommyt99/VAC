#include <iostream>
#include <vector>
#include <unordered_set>
#include <array>
#include <string>
#include <list>
#include <fstream>
//Vinh, excellent work.
using namespace std;
const int L = 3;
const int N = 3;
const double deltax = 0.1;
const double deltay = 0.1;
const double deltat = 0.004;
int iter = L / deltax;
double D = 1;
const int length = 30;
double epilson = pow(10, -6);
double northbound = 0;
double eastbound = 15;
double westbound = 15;
double southbound = 0;
double epsilon = pow(10, -6);

double f(double x, double y) {
//	double value = Ao * sin(3.14159265 * N * x / L);
	double value = sin(x + y);
	return sin(x + y);
}
void Initial(double x[length][length], double XHalf[length][length], double Next[length][length]) {
	cout << "Enter a north bound: ";
	cin >> northbound;
	cout << "Enter a east bound: ";
	cin >> eastbound;
	cout << "Enter a west bound: ";
	cin >> westbound;
	cout << "Enter a south bound: ";
	cin >> southbound;
	
	for (int i = 0; i < length; i++) {
		for (int j = 0; j < length; j++) {
			if (i == 0) {
				x[i][j] = northbound;
				XHalf[i][j] = northbound;
				Next[i][j] = northbound;
			}
			if (i == length - 1) {
				x[i][j] = southbound;
				XHalf[i][j] = southbound;
				Next[i][j] = southbound;
			}
			if (j == 0) {
				x[i][j] = westbound;
				XHalf[i][j] = westbound;
				Next[i][j] = westbound;
			}
			if (j == length - 1) {
				x[i][j] = eastbound;
				XHalf[i][j] = eastbound;
				Next[i][j] = eastbound;
			}
		}
	}

	for (int i = 1; i < length - 1; i++) {
		for (int j = 1; j < length - 1; j++) {
			x[i][j] = f(deltax * i, deltay * j);
		}
	}
	cout << endl << "Calculating..." << endl;
}
void Print(double x[length][length]) {
	for (int i = 0; i < length; i++) {
		for (int j = 0; j < length; j++) {
			cout << x[i][j] << " ";
		}
		cout << endl;
	}
}
void Copy(double Current[length][length], double Next[length][length]) {
	for (int i = 0; i < length; i++) {
		for (int j = 0; j < length; j++) {
			Current[i][j] = Next[i][j];
		}
	}
}
void FileWrite(double x[length][length]) {
	ofstream z("z.txt");
	int k = 0;
	for (int i = 0; i < length; i++) {
		for (int j = 0; j < length; j++) {
			z << x[i][j] << " ";
		}
		z << endl;
	}
	z.close();
}
bool Error(double Current[length][length], double Next[length][length]) {
	double sum1 = 0;
	double sum2 = 0;
	for (int i = 0; i < length; i++) {
		for (int j = 0; j < length; j++) {
			sum1 += Current[i][j];
			sum2 += Next[i][j];
		}
	}
	sum1 /= length;
	sum2 /= length;
	
	if (abs(sum1 - sum2) < epsilon) {
		return true;
	}
	else {
		return false;
	}

}
int main() {
	double Layer[length][length];
	double xHalf[length][length];
	double Next[length][length];
	Initial(Layer, xHalf, Next);
	
	for (int t = 0; t < 1000000; t++) {
		for (int i = 1; i < length - 1; i++) {
			for (int j = 1; j < length - 1; j++) {
				xHalf[i][j] = Layer[i][j] + (D * deltat / (deltax * deltax)) * (Layer[i][j - 1] - 2 * Layer[i][j] + Layer[i][j + 1]);
			}
		}
		for (int j = 1; j < length - 1; j++) {
			for (int i = 1; i < length - 1; i++) {
				Next[i][j] = xHalf[i][j] + (D * deltat / (deltay * deltay)) * (xHalf[i - 1][j] - 2 * xHalf[i][j] + xHalf[i + 1][j]);
			}
		}
		if (Error(Layer, Next) == true) {
			cout << "With an epsilon of " << epsilon << ", a result was found after " << t << " iterations" << endl;
			break;
		}
		Copy(Layer, Next);
	}

	FileWrite(Layer);
	cout << endl;
	cout << "A file called z.txt will be created" << endl;
	cout << "Take that file, dlmread it into matlab, then use surf to plot it, adjust the z axis accordingly using zlim if needed" << endl;
	cout << "Any further questions, just ask to Vinh Huynh" << endl;
	system("PAUSE");
	return 0;
}


