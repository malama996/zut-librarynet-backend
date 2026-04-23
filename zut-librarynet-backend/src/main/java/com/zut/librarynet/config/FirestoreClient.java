package com.zut.librarynet.config;import com.google.api.core.ApiFuture;import com.google.cloud.firestore.*;import com.google.firebase.FirebaseApp;import com.google.firebase.FirebaseOptions;import com.google.auth.oauth2.GoogleCredentials;
import org.jetbrains.annotations.NotNull;

import java.io.InputStream;import java.util.List;import java.util.Map;import java.util.concurrent.ExecutionException;public class FirestoreClient{public static Firestore getFirestore(){return com.google.firebase.cloud.FirestoreClient.getFirestore();}public static CollectionReference getCollection(String name){return getFirestore().collection(name);}public static List<QueryDocumentSnapshot> getAllDocuments(String col)throws ExecutionException,InterruptedException{return getFirestore().collection(col).get().get().getDocuments();}public static DocumentSnapshot getDocument(String col, String id)throws ExecutionException,InterruptedException{return getFirestore().collection(col).document(id).get().get();}public static ApiFuture<WriteResult> setDocument(String col, String id, Map<String,Object> data){return getFirestore().collection(col).document(id).set(data);}

    @NotNull
    public static ApiFuture<WriteResult> deleteDocument(String col, String id){return getFirestore().collection(col).document(id).delete();}}
