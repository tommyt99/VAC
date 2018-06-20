#include <iostream>
using namespace std;


//int const COLUMN_SIZE = 5;
//int const m[6][6]; 
//int const trans[6][6];
//
//void transpose(const int a[][COLUMN_SIZE] , int rowSize) {
//	for (int i = 0; i < 5; i++)
//		for (int j = 0; j < 1; j++)
//		{
//			cout << trans[j][i] = a[i][j];
//		}
//		
//}
//
////making matrix
//int main() {
//	int m[1][5] = {
//		{ 1,2,3,4,5 }
//	};
//	
//	//outputing matrix to window
//	for (int i = 0; i < 1; i++)
//		for (int j = 0; j < 5;j++) {
//		cout << m[i][j]<< endl; 
//	}
//
//	//tranposing matrix 
//	transpose(m, 1);
//
//	int o;
//	cin >> o;
//
//	return 0;
//}

//const int COLUMN_SIZE = 5; 
void transpose(int a[10][10], int r ,int c) {
	//transposing matrix 
	int trans[10][10],i,j; 
	for ( i = 0; i < r; ++i)
		for ( j = 0; j < c; ++j)
		{
			 trans[j][i] = a[i][j];
		}

	//outputting transposed matrix
	cout << "Transpose Matrix: " << endl;
	for ( i = 0; i < c; ++i)
		for ( j = 0; j < r; ++j)
		{
			cout << " " << trans[i][j];
			if (j == r - 1)
				cout << endl ;
		}
}



int main() {
	//initial conditions
	int a[10][10], r, c; //i, j;

	// user input row and column
	cout << "Please enter row and column: ";
	cin >> r >> c; 

	//user inputting each element inside matrix
	for (int i = 0; i < r; i++)
		for (int j = 0; j < c; j++) {
			cout << "Enter values inside matrix a " << "(" << i + 1 << "," << j + 1 << ")" << endl;
			cin >> a[i][j];
		}

	//displaying matrix
	cout << endl << "Entered matrix: " << endl; 
	for (int i = 0; i < r; i++)
		for (int j = 0; j < c;j++) 
			{
			cout << " " << a[i][j]; 
				if (j == c - 1) 
					cout << endl;
			}

	//transposing 
	transpose(a,r,c);


	int o;
	cin >> o; 
}