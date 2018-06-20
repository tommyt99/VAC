// There are two Pointer exercises included in this file.
#include <iostream>
using namespace std;

int main() {

	float arr[5];
	float *ptr;

	cout << "display address of array" << endl;

	for (int i = 0; i<5; ++i)
		cout << "&arr[" << i << "]" << &arr[i] << endl;

	ptr = arr; // this is equivalent to saying ptr = arr[0] or the first value 

	cout << "Display address using pointers: " << endl;

	for (int i = 0; i<5; ++i)
		cout << "ptr + " << i << "=" << ptr + i << endl;

	*(ptr + 2) = 3.1415926; // (*) gives the values inside the memory space

	cout << arr[2];

	int o;
	cin >> o; 
	return 0;
}

// Exercises: Pointers
// Exercise 1

#include <iostream>
using namespace std;

int main() {

	int  a; int b;
	cout << "Enter value of A: " << endl;
	cin >> a;
	cout << "Enter value of B: " << endl;
	cin >> b;

	int *ptrA = &a; // int* ()= &() saves the address AND the variable inside ptrA
	int *ptrB = &b;

	cout << "Value of ptrA is " << *ptrA << " sored in address " << ptrA << "\n";

	cout << "Value of ptrB is " << *ptrB << " sored in address " << ptrB << "\n";

	return 0;
}



